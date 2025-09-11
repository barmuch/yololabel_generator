import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateServerEnv } from '@/lib/env';
import { connectToDatabase } from '@/lib/mongodb';
import { ImageDocument } from '@/lib/schemas';

export const runtime = 'nodejs';

// Validate environment on startup
const env = validateServerEnv();

// Rate limiting: 10 PDF uploads per minute per IP (more restrictive than images)
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

/**
 * Complete PDF upload flow - saves each PDF page as an image document in MongoDB
 * Body: { projectId: string, pdfData: { publicId, filename, pageCount, pageInfos, etc } }
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await limiter.check(10, ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for PDF uploads. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { projectId, pdfData } = body;
    
    if (!projectId || !pdfData) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: projectId and pdfData',
          received: { projectId: !!projectId, pdfData: !!pdfData }
        },
        { status: 400 }
      );
    }

    console.log(`📄 Processing PDF complete upload for project: ${projectId}`);
    console.log(`PDF: ${pdfData.filename} with ${pdfData.pageCount} pages`);

    // Connect to MongoDB
    let db;
    try {
      const dbConnection = await connectToDatabase();
      db = dbConnection.db;
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }
    
    // Generate URLs for each PDF page
    let pdfPages;
    try {
      const { generateAllPdfPageUrls } = await import('@/lib/cloudinary-pdf');
      pdfPages = generateAllPdfPageUrls(pdfData.publicId, pdfData.pageCount, {
        preserveAspectRatio: true,
        quality: 'auto:best',
        maxWidth: 1200
      });
      console.log('Generated PDF page URLs:', pdfPages.length);
    } catch (urlError) {
      console.error('Error generating PDF URLs:', urlError);
      return NextResponse.json(
        { 
          error: 'Failed to generate PDF page URLs',
          details: urlError instanceof Error ? urlError.message : 'Unknown URL generation error'
        },
        { status: 500 }
      );
    }
    
    const savedImages: any[] = [];
    const errors: any[] = [];
    
    // Save each PDF page as an image document
    for (const page of pdfPages) {
      try {
        // Get page-specific info or fallback to overall PDF info
        const pageInfo = pdfData.pageInfos?.find((p: any) => p.pageNumber === page.pageNumber) || {
          width: pdfData.width,
          height: pdfData.height,
          orientation: pdfData.orientation
        };
        
        // Calculate canvas dimensions for this specific page
        const aspectRatio = pageInfo.width / pageInfo.height;
        let canvasWidth = 1200;
        let canvasHeight = Math.round(canvasWidth / aspectRatio);
        
        // For landscape pages (width > height), prioritize width constraint
        // For portrait pages (height > width), check height constraint  
        if (pageInfo.orientation === 'landscape' || aspectRatio > 1) {
          // Landscape: width is dominant
          if (canvasHeight > 1600) {
            canvasHeight = 1600;
            canvasWidth = Math.round(canvasHeight * aspectRatio);
          }
        } else {
          // Portrait: height is dominant
          if (canvasHeight > 1600) {
            canvasHeight = 1600;
            canvasWidth = Math.round(canvasHeight * aspectRatio);
          }
        }
        
        // Generate unique image ID for this PDF page
        const imageId = `pdf_${pdfData.publicId}_page_${page.pageNumber}_${Date.now()}`;
        
        const imageDoc: ImageDocument = {
          id: imageId,
          projectId: projectId,
          name: `${pdfData.filename} - Page ${page.pageNumber}`,
          originalName: `${pdfData.filename} - Page ${page.pageNumber}`,
          cloudinary: {
            public_id: pdfData.publicId, // Keep original PDF public_id
            secure_url: page.url,
            url: page.url,
            width: canvasWidth,
            height: canvasHeight,
            format: 'png', // PDF pages are converted to PNG
            bytes: pdfData.bytes || 0,
            resource_type: 'image', // Treated as image after conversion
          },
          width: canvasWidth,
          height: canvasHeight,
          format: 'png',
          size: pdfData.bytes || 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'new',
          annotationCount: 0,
          // PDF-specific metadata
          originalFormat: 'pdf',
          isPdfPage: true,
          pdfPageNumber: page.pageNumber,
          originalPdfName: pdfData.filename,
          pdfOrientation: pageInfo.orientation,
          originalPdfWidth: pageInfo.width,
          originalPdfHeight: pageInfo.height
        };
        
        console.log(`💾 Saving PDF page ${page.pageNumber} to MongoDB...`);
        const result = await db.collection('images').insertOne(imageDoc);
        
        savedImages.push({
          ...imageDoc,
          _id: result.insertedId
        });
        
        console.log(`✅ Saved PDF page ${page.pageNumber} with _id: ${result.insertedId}`);
      } catch (pageError) {
        console.error(`Error saving page ${page.pageNumber}:`, pageError);
        errors.push({
          pageNumber: page.pageNumber,
          error: pageError instanceof Error ? pageError.message : 'Unknown error'
        });
      }
    }
    
    // If no pages were saved successfully, return error
    if (savedImages.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to save any PDF pages to database',
          details: errors
        },
        { status: 500 }
      );
    }
    
    // Update project statistics
    try {
      await db.collection('projects').updateOne(
        { id: projectId },
        { 
          $inc: { imageCount: savedImages.length },
          $set: { updatedAt: Date.now() }
        }
      );
      console.log(`📊 Updated project statistics: +${savedImages.length} images`);
    } catch (updateError) {
      console.error('Error updating project statistics:', updateError);
      // Don't fail the whole operation for this
    }
    
    console.log(`✅ PDF complete upload successful: ${savedImages.length} pages saved`);
    
    // Return data in format expected by frontend
    const response = {
      success: true,
      savedPages: savedImages.length,
      totalPages: pdfData.pageCount,
      errors: errors.length > 0 ? errors : undefined,
      imageDocuments: savedImages.map(img => ({
        id: img.id,
        name: img.name,
        width: img.width,
        height: img.height,
        url: img.cloudinary.secure_url,
        cloudinary: img.cloudinary,
        status: img.status,
        originalFormat: img.originalFormat,
        isPdfPage: img.isPdfPage,
        pdfPageNumber: img.pdfPageNumber,
        originalPdfName: img.originalPdfName
      }))
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error in PDF complete upload:', error);
    
    const errorResponse: any = {
      success: false,
      error: 'Failed to save PDF pages to database',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    // In development, include stack trace
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error instanceof Error ? error.stack : undefined;
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
