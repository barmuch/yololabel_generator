import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { rateLimit } from '@/lib/rate-limit';

// Rate limiting: 10 bulk operations per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

/**
 * DELETE: Bulk delete multiple images from MongoDB and optionally from Cloudinary
 * Body: { 
 *   imageIds: string[], 
 *   projectId: string, 
 *   deleteFromCloudinary?: boolean 
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting check (consistent pattern with other routes)
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
    const { success: rlOk } = await limiter.check(10, ip);
    if (!rlOk) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'X-RateLimit-Hit': 'true' } });
    }

    const body = await request.json();
    const { imageIds, projectId, deleteFromCloudinary = false } = body;

    // Validation
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ 
        error: 'imageIds must be a non-empty array' 
      }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    // Limit bulk operations to prevent abuse
    if (imageIds.length > 50) {
      return NextResponse.json({ 
        error: 'Maximum 50 images can be deleted at once' 
      }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Bulk deleting images:', { 
        count: imageIds.length, 
        projectId, 
        deleteFromCloudinary 
      });
    }

    const db = await getDatabase();
    const { ObjectId } = require('mongodb');

    const results = {
      totalRequested: imageIds.length,
      deletedFromDatabase: 0,
      deletedAnnotations: 0,
      cloudinaryResults: [] as any[],
      errors: [] as any[]
    };

    // Process each image
    for (const imageId of imageIds) {
      try {
        // Find the image first
        let imageToDelete = await db.collection('images').findOne({ 
          id: imageId, 
          projectId: projectId 
        });

        // If not found by custom 'id', try by MongoDB '_id'
        if (!imageToDelete && ObjectId.isValid(imageId)) {
          imageToDelete = await db.collection('images').findOne({ 
            _id: new ObjectId(imageId), 
            projectId: projectId 
          });
        }

        if (!imageToDelete) {
          results.errors.push({
            imageId,
            error: 'Image not found'
          });
          continue;
        }

        // Delete from MongoDB
        let deleteResult;
        if (imageToDelete.id) {
          deleteResult = await db.collection('images').deleteOne({ 
            id: imageId, 
            projectId: projectId 
          });
        } else {
          deleteResult = await db.collection('images').deleteOne({ 
            _id: imageToDelete._id, 
            projectId: projectId 
          });
        }

        if (deleteResult.deletedCount > 0) {
          results.deletedFromDatabase++;

          // Delete associated annotations
          const actualImageId = imageToDelete.id || imageToDelete._id.toString();
          const annotationsDeleteResult = await db.collection('annotations').deleteMany({ 
            imageId: actualImageId,
            projectId: projectId 
          });
          
          results.deletedAnnotations += annotationsDeleteResult.deletedCount;

          // Delete from Cloudinary if requested
          if (deleteFromCloudinary && imageToDelete.cloudinary?.public_id) {
            try {
              const baseUrl = request.nextUrl.origin;
              const cloudinaryResponse = await fetch(
                `${baseUrl}/api/upload?public_id=${encodeURIComponent(imageToDelete.cloudinary.public_id)}`, 
                { method: 'DELETE' }
              );
              
              const cloudinaryResult = await cloudinaryResponse.json();
              results.cloudinaryResults.push({
                imageId,
                publicId: imageToDelete.cloudinary.public_id,
                success: cloudinaryResult.success,
                result: cloudinaryResult
              });
            } catch (cloudinaryError) {
              results.cloudinaryResults.push({
                imageId,
                publicId: imageToDelete.cloudinary.public_id,
                success: false,
                error: cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown error'
              });
            }
          }
        } else {
          results.errors.push({
            imageId,
            error: 'Failed to delete from database'
          });
        }
      } catch (error) {
        results.errors.push({
          imageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update project counts
    if (results.deletedFromDatabase > 0) {
      await db.collection('projects').updateOne(
        { id: projectId },
        { 
          $inc: { 
            imageCount: -results.deletedFromDatabase,
            annotationCount: -results.deletedAnnotations
          },
          $set: { updatedAt: Date.now() }
        }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Bulk delete completed:', results);
    }

    return NextResponse.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Bulk delete API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}