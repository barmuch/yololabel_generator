import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AnnotationDocument } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const imageId = searchParams.get('imageId');
    
    console.log('🔍 Fetching annotations for:', { projectId, imageId });
    
    const { db } = await connectToDatabase();
    
    let filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (imageId) filter.imageId = imageId;
    
    // Get annotations
    const annotations = await db.collection('annotations')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`✅ Found ${annotations.length} annotations`);
    
    return NextResponse.json({
      success: true,
      annotations
    });
    
  } catch (error) {
    console.error('❌ Error fetching annotations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch annotations'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const annotationData = await request.json();
    
    console.log('💾 Saving annotation to MongoDB:', annotationData.id);
    
    const { db } = await connectToDatabase();
    
    // Prepare annotation document
    const annotationDoc: AnnotationDocument = {
      id: annotationData.id,
      projectId: annotationData.projectId,
      imageId: annotationData.imageId,
      bbox: annotationData.bbox,
      classId: annotationData.classId,
      className: annotationData.className,
      confidence: annotationData.confidence,
      yolo: annotationData.yolo,
      createdAt: annotationData.createdAt || Date.now(),
      updatedAt: Date.now(),
      createdBy: annotationData.createdBy
    };
    
    // Insert annotation into MongoDB
    const result = await db.collection('annotations').insertOne(annotationDoc);
    
    // Update image's annotation count
    await db.collection('images').updateOne(
      { id: annotationData.imageId },
      { 
        $inc: { annotationCount: 1 },
        $set: { 
          updatedAt: Date.now(),
          status: 'labeled'
        }
      }
    );
    
    // Update project's annotation count
    await db.collection('projects').updateOne(
      { id: annotationData.projectId },
      { 
        $inc: { annotationCount: 1 },
        $set: { updatedAt: Date.now() }
      }
    );
    
    console.log(`✅ Annotation saved with _id: ${result.insertedId}`);
    
    return NextResponse.json({
      success: true,
      annotation: { ...annotationDoc, _id: result.insertedId }
    });
    
  } catch (error) {
    console.error('❌ Error saving annotation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save annotation'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updateData = await request.json();
    
    console.log('🔄 Updating annotation:', updateData.id);
    
    const { db } = await connectToDatabase();
    
    // Update annotation
    const result = await db.collection('annotations').updateOne(
      { id: updateData.id },
      { 
        $set: {
          ...updateData,
          updatedAt: Date.now()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Annotation not found'
      }, { status: 404 });
    }
    
    console.log(`✅ Annotation updated: ${result.modifiedCount} documents modified`);
    
    return NextResponse.json({
      success: true,
      modified: result.modifiedCount > 0
    });
    
  } catch (error) {
    console.error('❌ Error updating annotation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update annotation'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const annotationId = searchParams.get('id');
    const imageId = searchParams.get('imageId');
    const projectId = searchParams.get('projectId');
    
    if (!annotationId || !imageId || !projectId) {
      return NextResponse.json({
        success: false,
        error: 'Annotation ID, Image ID, and Project ID are required'
      }, { status: 400 });
    }
    
    console.log('🗑️ Deleting annotation:', annotationId);
    
    const { db } = await connectToDatabase();
    
    // Delete annotation
    const deleteResult = await db.collection('annotations').deleteOne({ id: annotationId });
    
    if (deleteResult.deletedCount > 0) {
      // Update image's annotation count
      await db.collection('images').updateOne(
        { id: imageId },
        { 
          $inc: { annotationCount: -1 },
          $set: { updatedAt: Date.now() }
        }
      );
      
      // Update project's annotation count
      await db.collection('projects').updateOne(
        { id: projectId },
        { 
          $inc: { annotationCount: -1 },
          $set: { updatedAt: Date.now() }
        }
      );
      
      // Check if image still has annotations, if not change status back to 'new'
      const remainingAnnotations = await db.collection('annotations').countDocuments({ imageId });
      if (remainingAnnotations === 0) {
        await db.collection('images').updateOne(
          { id: imageId },
          { $set: { status: 'new' } }
        );
      }
    }
    
    console.log(`✅ Deleted annotation: ${deleteResult.deletedCount > 0}`);
    
    return NextResponse.json({
      success: true,
      deleted: deleteResult.deletedCount > 0
    });
    
  } catch (error) {
    console.error('❌ Error deleting annotation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete annotation'
    }, { status: 500 });
  }
}
