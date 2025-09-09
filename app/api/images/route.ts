import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { validateServerEnv } from '@/lib/env';
import { imageMetadataSchema, updateImageMetadataSchema, updateImageByPublicIdSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Validate environment on startup
const env = validateServerEnv();

// Rate limiting: 100 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

/**
 * Secure POST: Validates and stores image metadata in the database
 * Body: { projectId: string, publicId: string, url: string, width?: number, height?: number, format?: string, bytes?: number, annotations?: any[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await limiter.check(50, ip); // Lower limit for POST operations
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Validate content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit for JSON
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 1MB.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    
    // Validate input data
    const validationResult = imageMetadataSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: env.NODE_ENV === 'development' ? validationResult.error.issues : undefined,
        },
        { status: 400 }
      );
    }

    const imageData = validationResult.data;
    const db = await getDatabase();
    const images = db.collection('images');

    // Check if image already exists
    const existingImage = await images.findOne({ 
      projectId: imageData.projectId, 
      public_id: imageData.public_id 
    });

    if (existingImage) {
      return NextResponse.json(
        { error: 'Image already exists in this project' },
        { status: 409 }
      );
    }

    // Insert with server-side timestamps
    const now = new Date();
    const doc = {
      projectId: imageData.projectId,
      public_id: imageData.public_id, // Keep original field name for compatibility
      secure_url: imageData.secure_url, // Keep original field name for compatibility
      width: imageData.width || null,
      height: imageData.height || null,
      format: imageData.format || null,
      bytes: imageData.bytes || null,
      originalName: imageData.originalName || null,
      annotations: [], // Initialize empty annotations array
      createdAt: now,
      updatedAt: now,
    };

    const result = await images.insertOne(doc);

    return NextResponse.json({ 
      success: true, 
      id: result.insertedId,
      doc,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('API /api/images POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save image metadata',
        details: env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Secure GET: Retrieves images for a project with validation and rate limiting
 * Query: ?projectId=<string>
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await limiter.check(100, ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const db = await getDatabase();
    const images = db.collection('images');

    if (projectId) {
      // Validate and sanitize projectId
      if (typeof projectId !== 'string' || projectId.trim() === '') {
        return NextResponse.json(
          { error: 'Project ID must be a non-empty string' },
          { status: 400 }
        );
      }

      const sanitizedProjectId = projectId.trim().slice(0, 100); // Reasonable length limit

      const docs = await images
        .find({ projectId: sanitizedProjectId })
        .sort({ createdAt: -1 })
        .limit(1000) // Prevent excessive data retrieval
        .toArray();

      // Sanitize response data
      const sanitizedImages = docs.map((image: any) => ({
        _id: image._id,
        id: image.id, // Include the stable image ID
        projectId: image.projectId,
        publicId: image.cloudinary?.public_id || image.publicId || image.public_id,
        url: image.cloudinary?.secure_url || image.url || image.secure_url,
        originalName: image.originalName || image.name,
        width: typeof image.width === 'number' ? image.width : null,
        height: typeof image.height === 'number' ? image.height : null,
        format: image.format,
        bytes: image.bytes,
        annotations: Array.isArray(image.annotations) ? image.annotations : [],
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
      }));

      return NextResponse.json({ success: true, images: sanitizedImages });
    }

    // Return recent images (limit 50) if no projectId specified
    const docs = await images
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const sanitizedImages = docs.map((image: any) => ({
      _id: image._id,
      projectId: image.projectId,
      publicId: image.cloudinary?.public_id || image.publicId || image.public_id,
      url: image.cloudinary?.secure_url || image.url || image.secure_url,
      originalName: image.originalName || image.name,
      width: typeof image.width === 'number' ? image.width : null,
      height: typeof image.height === 'number' ? image.height : null,
      format: image.format,
      bytes: image.bytes,
      annotations: Array.isArray(image.annotations) ? image.annotations : [],
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }));

    return NextResponse.json({ success: true, images: sanitizedImages });
  } catch (error) {
    console.error('API /api/images GET error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to query images',
        details: env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Secure PUT: Updates image annotations with validation
 * Body: { id: ObjectId, annotations: any[] }
 */
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await limiter.check(50, ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Try to validate with ObjectId first, then with public_id
    const objectIdValidation = updateImageMetadataSchema.safeParse(body);
    const publicIdValidation = updateImageByPublicIdSchema.safeParse(body);
    
    if (!objectIdValidation.success && !publicIdValidation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data - must provide either ObjectId or (projectId + public_id)',
          details: env.NODE_ENV === 'development' ? {
            objectIdErrors: objectIdValidation.error?.issues,
            publicIdErrors: publicIdValidation.error?.issues,
          } : undefined,
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const images = db.collection('images');
    let result;

    if (publicIdValidation.success) {
      // Update by public_id and projectId (preferred for real-time collaboration)
      const { projectId, public_id, annotations } = publicIdValidation.data;
      
      result = await images.updateOne(
        { 
          projectId: projectId,
          public_id: public_id 
        },
        { 
          $set: { 
            annotations,
            updatedAt: new Date(),
          } 
        }
      );
      
      console.log(`Updated annotations for image ${public_id} in project ${projectId}`);
    } else if (objectIdValidation.success) {
      // Update by ObjectId (fallback method)
      const { id, annotations } = objectIdValidation.data;
      
      result = await images.updateOne(
        { _id: id },
        { 
          $set: { 
            annotations,
            updatedAt: new Date(),
          } 
        }
      );
      
      console.log(`Updated annotations for image ObjectId ${id}`);
    } else {
      return NextResponse.json(
        { error: 'Invalid validation state' },
        { status: 500 }
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      modifiedCount: result.modifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating image annotations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update image annotations',
        details: env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Removes an image from MongoDB and optionally from Cloudinary
 * Query params: imageId (required), projectId (required), deleteFromCloudinary (optional)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await limiter.check(10, ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const projectId = searchParams.get('projectId');
    const deleteFromCloudinary = searchParams.get('deleteFromCloudinary') === 'true';
    
    if (!imageId || !projectId) {
      return NextResponse.json(
        { error: 'imageId and projectId are required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting image from MongoDB:', { imageId, projectId, deleteFromCloudinary });

    const db = await getDatabase();

    // Find the image first to get Cloudinary info if needed
    // Try to find by custom 'id' field first, then by MongoDB '_id'
    let imageToDelete = await db.collection('images').findOne({ 
      id: imageId, 
      projectId: projectId 
    });

    // If not found by custom 'id', try by MongoDB '_id'
    if (!imageToDelete) {
      try {
        const { ObjectId } = require('mongodb');
        // Check if the imageId is a valid ObjectId format
        if (ObjectId.isValid(imageId)) {
          imageToDelete = await db.collection('images').findOne({ 
            _id: new ObjectId(imageId), 
            projectId: projectId 
          });
        }
      } catch (error) {
        console.log('🔍 Failed to parse as ObjectId:', imageId, error);
      }
    }

    if (!imageToDelete) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete the image from MongoDB using the same criteria that found it
    let deleteResult;
    if (imageToDelete.id) {
      // If it has a custom 'id' field, use that
      deleteResult = await db.collection('images').deleteOne({ 
        id: imageId, 
        projectId: projectId 
      });
    } else {
      // Otherwise, use the MongoDB '_id'
      deleteResult = await db.collection('images').deleteOne({ 
        _id: imageToDelete._id, 
        projectId: projectId 
      });
    }

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete image from database' },
        { status: 500 }
      );
    }

    // Delete all associated annotations (use the actual imageId used for annotations)
    const actualImageId = imageToDelete.id || imageToDelete._id.toString();
    const annotationsDeleteResult = await db.collection('annotations').deleteMany({ 
      imageId: actualImageId,
      projectId: projectId 
    });

    console.log(`✅ Deleted image from MongoDB. Also deleted ${annotationsDeleteResult.deletedCount} associated annotations`);

    // Update project's image and annotation counts
    await db.collection('projects').updateOne(
      { id: projectId },
      { 
        $inc: { 
          imageCount: -1,
          annotationCount: -annotationsDeleteResult.deletedCount
        },
        $set: { updatedAt: Date.now() }
      }
    );

    // Optionally delete from Cloudinary
    let cloudinaryResult = null;
    if (deleteFromCloudinary && imageToDelete.cloudinary?.public_id) {
      try {
        console.log('🗑️ Also deleting from Cloudinary:', imageToDelete.cloudinary.public_id);
        
        const baseUrl = request.nextUrl.origin;
        const cloudinaryResponse = await fetch(`${baseUrl}/api/upload?public_id=${encodeURIComponent(imageToDelete.cloudinary.public_id)}`, {
          method: 'DELETE',
        });

        cloudinaryResult = await cloudinaryResponse.json();
        if (cloudinaryResult.success) {
          console.log('✅ Successfully deleted from Cloudinary');
        } else {
          console.warn('⚠️ Failed to delete from Cloudinary:', cloudinaryResult);
        }
      } catch (error) {
        console.error('❌ Error deleting from Cloudinary:', error);
        cloudinaryResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({ 
      success: true,
      deletedFromDatabase: true,
      deletedAnnotations: annotationsDeleteResult.deletedCount,
      cloudinaryResult: cloudinaryResult,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete image',
        details: env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
