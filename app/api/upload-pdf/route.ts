import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Missing Cloudinary credentials:', {
        cloud_name: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET
      });
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Cloudinary credentials not configured'
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    console.log('Starting PDF upload:', { name: file.name, size: file.size });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload PDF to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'yolo-pdfs',
          format: 'pdf',
          public_id: `pdf_${Date.now()}`,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload success:', result?.public_id);
            resolve(result);
          }
        }
      ).end(buffer);
    });

    const result = uploadResult as any;

    // Get PDF info to determine page count and dimensions
    console.log('Getting PDF info from Cloudinary...');
    let pdfInfo;
    try {
      pdfInfo = await cloudinary.api.resource(result.public_id, {
        resource_type: 'image',
        pages: true
      });
      console.log('PDF Info:', {
        pages: pdfInfo.pages,
        width: pdfInfo.width,
        height: pdfInfo.height,
        format: pdfInfo.format
      });
    } catch (apiError) {
      console.error('Error getting PDF info from Cloudinary API:', apiError);
      // Fallback to basic info
      pdfInfo = {
        pages: 1,
        width: 595,
        height: 842,
        format: 'pdf'
      };
      console.log('Using fallback PDF info:', pdfInfo);
    }

    // Get dimensions for each page using Cloudinary URL info
    const pageInfos = [];
    const pageCount = pdfInfo.pages || 1;
    
    console.log(`Processing ${pageCount} pages...`);
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        // Use Cloudinary's info API to get dimensions for each page
        const pageUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_png,pg_${i},fl_getinfo/${result.public_id}.json`;
        console.log(`Fetching page ${i} info from:`, pageUrl);
        
        const pageResponse = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'YoloLabelGenerator/1.0'
          }
        });
        
        if (pageResponse.ok) {
          const pageData = await pageResponse.json();
          console.log(`Page ${i} data:`, pageData);
          
          pageInfos.push({
            pageNumber: i,
            width: pageData.input?.width || pdfInfo.width,
            height: pageData.input?.height || pdfInfo.height,
            orientation: (pageData.input?.width || pdfInfo.width) > (pageData.input?.height || pdfInfo.height) ? 'landscape' : 'portrait'
          });
        } else {
          console.warn(`Failed to get page ${i} info (${pageResponse.status}), using fallback`);
          // Fallback to original PDF dimensions
          pageInfos.push({
            pageNumber: i,
            width: pdfInfo.width || 595,
            height: pdfInfo.height || 842,
            orientation: (pdfInfo.width || 595) > (pdfInfo.height || 842) ? 'landscape' : 'portrait'
          });
        }
      } catch (error) {
        console.error(`Error getting info for page ${i}:`, error);
        // Fallback to original PDF dimensions
        pageInfos.push({
          pageNumber: i,
          width: pdfInfo.width || 595,
          height: pdfInfo.height || 842,
          orientation: (pdfInfo.width || 595) > (pdfInfo.height || 842) ? 'landscape' : 'portrait'
        });
      }
    }

    console.log('Page infos:', pageInfos);

    const response = {
      success: true,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      pageCount: pageCount,
      filename: file.name,
      size: file.size,
      // Include original PDF dimensions and orientation
      width: pdfInfo.width || 595, // Default PDF width
      height: pdfInfo.height || 842, // Default PDF height
      format: pdfInfo.format || 'pdf',
      orientation: (pdfInfo.width || 595) > (pdfInfo.height || 842) ? 'landscape' : 'portrait', // Overall orientation
      pageInfos: pageInfos // Per-page orientation and dimensions
    };

    console.log('PDF upload completed successfully:', { publicId: result.public_id, pageCount });
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error uploading PDF:', error);
    
    // More detailed error response
    const errorResponse: any = {
      error: 'Failed to upload PDF',
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
