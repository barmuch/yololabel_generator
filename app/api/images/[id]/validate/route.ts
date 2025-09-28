import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';

// PATCH: Validate/unvalidate an image (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { action } = await req.json();
    if (!['validate', 'unvalidate'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const db = await getDatabase();
    const imageId = params.id;

    if (action === 'validate') {
      // Validate image
      const result = await db.collection('images').updateOne(
        { id: imageId },
        {
          $set: {
            status: 'validated',
            validatedBy: token.username, // Username from token
            validatedAt: Date.now(),
            updatedAt: Date.now()
          }
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Image validated successfully',
        status: 'validated'
      });
    } else {
      // Unvalidate image
      const result = await db.collection('images').updateOne(
        { id: imageId },
        {
          $set: {
            status: 'labeled',
            updatedAt: Date.now()
          },
          $unset: {
            validatedBy: "",
            validatedAt: ""
          }
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Image validation removed',
        status: 'labeled'
      });
    }

  } catch (error) {
    console.error('❌ Error updating image validation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update validation'
    }, { status: 500 });
  }
}