import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const db = await getDatabase();
    const project = await db.collection('projects').findOne({ id }, { projection: { _id: 0 } });
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
  }
}
