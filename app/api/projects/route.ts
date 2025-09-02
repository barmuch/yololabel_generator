import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const projects = await db.collection('projects').find({}, { projection: { _id: 0 } }).toArray();
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json({ success: false, error: 'Invalid project payload' }, { status: 400 });
    }

    const db = await getDatabase();

    // Upsert by project id
    await db.collection('projects').updateOne({ id: body.id }, { $set: body }, { upsert: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save project' }, { status: 500 });
  }
}
