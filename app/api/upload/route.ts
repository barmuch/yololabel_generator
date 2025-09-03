import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { validateServerEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

// Force Node runtime for this API route so the Cloudinary Node SDK works correctly
export const runtime = 'nodejs';

// Validate environment on startup
const env = validateServerEnv();

// Configure Cloudinary securely
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Rate limiting: 20 uploads per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await limiter.check(20, ip); // 20 requests per minute
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

    console.log('Processing upload:', file.name, 'size:', file.size, 'type:', file.type);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to data URI
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary with security options
    const uploadOptions = {
      resource_type: 'image' as const,
      folder: 'yolo-labels', // Organize uploads in folder
      quality: 'auto', // Optimize quality
      // Security: disable script tags and other potentially harmful content
      moderation: 'manual',
    };

    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(dataUri, uploadOptions);
      console.log('Upload success:', cloudinaryResult.public_id);
    } catch (signedErr: any) {
      console.error('Signed upload failed:', signedErr);

      // Fallback to unsigned preset if configured (development only)
      if (env.NODE_ENV === 'development' && env.CLOUDINARY_UNSIGNED_PRESET) {
        console.log('Attempting unsigned upload fallback');
        try {
          cloudinaryResult = await cloudinary.uploader.upload(dataUri, {
            ...uploadOptions,
            upload_preset: env.CLOUDINARY_UNSIGNED_PRESET,
          });
          console.log('Unsigned upload success:', cloudinaryResult.public_id);
        } catch (unsignedErr) {
          console.error('Unsigned upload failed:', unsignedErr);
          throw unsignedErr;
        }
      } else {
        throw signedErr;
      }
    }

    return NextResponse.json({
      success: true,
      url: cloudinaryResult.secure_url, // Always use HTTPS
      public_id: cloudinaryResult.public_id,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload image',
        details: env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
      return NextResponse.json({ error: 'No public_id provided' }, { status: 400 });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({
      success: true,
      result: result.result,
    });

  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image from Cloudinary' },
      { status: 500 }
    );
  }
}
