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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'yolo-pdfs',
          format: 'pdf',
          public_id: `pdf_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const result = uploadResult as any;

    // Get PDF info to determine page count and dimensions
    const pdfInfo = await cloudinary.api.resource(result.public_id, {
      resource_type: 'image',
      pages: true
    });

    console.log('PDF Info:', {
      pages: pdfInfo.pages,
      width: pdfInfo.width,
      height: pdfInfo.height,
      format: pdfInfo.format
    });

    // Get dimensions for each page using Cloudinary URL info
    const pageInfos = [];
    const pageCount = pdfInfo.pages || 1;
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        // Use Cloudinary's info API to get dimensions for each page
        const pageUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_png,pg_${i},fl_getinfo/${result.public_id}.json`;
        const pageResponse = await fetch(pageUrl);
        
        if (pageResponse.ok) {
          const pageData = await pageResponse.json();
          pageInfos.push({
            pageNumber: i,
            width: pageData.input?.width || pdfInfo.width,
            height: pageData.input?.height || pdfInfo.height,
            orientation: (pageData.input?.width || pdfInfo.width) > (pageData.input?.height || pdfInfo.height) ? 'landscape' : 'portrait'
          });
        } else {
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

    return NextResponse.json({
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
      orientation: pdfInfo.width > pdfInfo.height ? 'landscape' : 'portrait', // Overall orientation
      pageInfos: pageInfos // Per-page orientation and dimensions
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
