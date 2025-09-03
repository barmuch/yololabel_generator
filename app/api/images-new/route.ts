import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ImageDocument } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }
    
    console.log('🔍 Fetching images for project:', projectId);
    
    const { db } = await connectToDatabase();
    
    // Get all images for this project
    const images = await db.collection('images')
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`✅ Found ${images.length} images for project ${projectId}`);
    
    return NextResponse.json({
      success: true,
      images
    });
    
  } catch (error) {
    console.error('❌ Error fetching images:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch images'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const imageData = await request.json();
    
    console.log('💾 Saving image metadata to MongoDB:', imageData.name);
    
    const { db } = await connectToDatabase();
    
    // Prepare image document
    const imageDoc: ImageDocument = {
      id: imageData.id,
      projectId: imageData.projectId,
      name: imageData.name,
      originalName: imageData.originalName,
      cloudinary: imageData.cloudinary,
      width: imageData.width,
      height: imageData.height,
      format: imageData.format || imageData.cloudinary?.format || 'unknown',
      size: imageData.size || imageData.cloudinary?.bytes || 0,
      createdAt: imageData.createdAt || Date.now(),
      updatedAt: Date.now(),
      status: imageData.status || 'new',
      annotationCount: 0
    };
    
    // Insert image metadata into MongoDB
    const result = await db.collection('images').insertOne(imageDoc);
    
    // Update project's image count
    await db.collection('projects').updateOne(
      { id: imageData.projectId },
      { 
        $inc: { imageCount: 1 },
        $set: { updatedAt: Date.now() }
      }
    );
    
    console.log(`✅ Image metadata saved with _id: ${result.insertedId}`);
    
    return NextResponse.json({
      success: true,
      image: { ...imageDoc, _id: result.insertedId }
    });
    
  } catch (error) {
    console.error('❌ Error saving image metadata:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save image metadata'
    }, { status: 500 });
  }
}
