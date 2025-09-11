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
    const { projectId, pdfData } = await request.json();
    
    if (!projectId || !pdfData) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and pdfData' },
        { status: 400 }
      );
    }

    console.log(`📄 Processing PDF complete upload for project: ${projectId}`);
    console.log(`PDF: ${pdfData.filename} with ${pdfData.pageCount} pages`);

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Generate URLs for each PDF page
    const { generateAllPdfPageUrls } = await import('@/lib/cloudinary-pdf');
    const pdfPages = generateAllPdfPageUrls(pdfData.publicId, pdfData.pageCount, {
      preserveAspectRatio: true,
      quality: 'auto:best',
      maxWidth: 1200
    });
    
    const savedImages: any[] = [];
    
    // Save each PDF page as an image document
    for (const page of pdfPages) {
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
    }
    
    // Update project statistics
    await db.collection('projects').updateOne(
      { id: projectId },
      { 
        $inc: { imageCount: pdfData.pageCount },
        $set: { updatedAt: Date.now() }
      }
    );
    
    console.log(`✅ PDF complete upload successful: ${savedImages.length} pages saved`);
    
    // Return data in format expected by frontend
    return NextResponse.json({
      success: true,
      savedPages: savedImages.length,
      totalPages: pdfData.pageCount,
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
    });
    
  } catch (error) {
    console.error('❌ Error in PDF complete upload:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save PDF pages to database'
    }, { status: 500 });
  }
}
