import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';

export const runtime = 'nodejs';

/**
 * Debug endpoint to inspect image data in MongoDB
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10');

    const db = await getDatabase();
    const images = db.collection('images');

    let query = {};
    if (projectId) {
      query = { projectId };
    }

    const docs = await images.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Return detailed info for debugging
    const debugInfo = docs.map(doc => ({
      _id: doc._id,
      projectId: doc.projectId,
      public_id: doc.public_id,
      secure_url: doc.secure_url,
      originalName: doc.originalName,
      width: doc.width,
      height: doc.height,
      format: doc.format,
      bytes: doc.bytes,
      createdAt: doc.createdAt,
      hasSecureUrl: !!doc.secure_url,
      secureUrlLength: doc.secure_url?.length || 0,
    }));

    return NextResponse.json({ 
      success: true, 
      count: docs.length,
      query,
      images: debugInfo 
    });
  } catch (error) {
    console.error('API /api/debug/images GET error:', error);
    return NextResponse.json({ error: 'Failed to query debug images' }, { status: 500 });
  }
}
