import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { validateServerEnv } from '@/lib/env';
import { connectToDatabase } from '@/lib/mongodb';
import { ImageDocument } from '@/lib/schemas';

// Force Node runtime for this API route
export const runtime = 'nodejs';

// Validate environment on startup
const env = validateServerEnv();

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting complete upload flow...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    
    if (!file || !projectId) {
      return NextResponse.json({
        success: false,
        error: 'File and projectId are required'
      }, { status: 400 });
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'File must be an image'
      }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 413 });
    }

    console.log(`📁 Processing upload: ${file.name} (${file.size} bytes) for project: ${projectId}`);

    // Step 1: Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploadOptions = {
      resource_type: 'image' as const,
      folder: `yolo-labels/${projectId}`, // Organize by project
      quality: 'auto',
      moderation: 'manual',
    };

    console.log('☁️ Uploading to Cloudinary...');
    const cloudinaryResult = await cloudinary.uploader.upload(dataUri, uploadOptions);
    console.log(`✅ Cloudinary upload success: ${cloudinaryResult.public_id}`);

    // Step 2: Save metadata to MongoDB
    const { db } = await connectToDatabase();
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const imageDoc: ImageDocument = {
      id: imageId,
      projectId: projectId,
      name: file.name,
      originalName: file.name,
      cloudinary: {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
        url: cloudinaryResult.url,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        bytes: cloudinaryResult.bytes,
        resource_type: cloudinaryResult.resource_type,
      },
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      annotationCount: 0
    };

    console.log('💾 Saving image metadata to MongoDB...');
    const result = await db.collection('images').insertOne(imageDoc);

    // Step 3: Update project statistics
    await db.collection('projects').updateOne(
      { id: projectId },
      { 
        $inc: { imageCount: 1 },
        $set: { updatedAt: Date.now() }
      }
    );

    console.log(`✅ Complete upload flow successful: ${result.insertedId}`);

    // Return data in format expected by frontend
    return NextResponse.json({
      success: true,
      public_id: cloudinaryResult.public_id,
      url: cloudinaryResult.secure_url,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
      imageMetadata: {
        ...imageDoc,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('❌ Complete upload flow failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 });
  }
}
