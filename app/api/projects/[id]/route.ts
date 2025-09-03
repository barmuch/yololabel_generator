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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log('Deleting project from MongoDB:', id);
    
    const db = await getDatabase();
    
    // Delete project from projects collection
    const projectResult = await db.collection('projects').deleteOne({ id });
    
    // Also delete all related images from images collection
    const imagesResult = await db.collection('images').deleteMany({ projectId: id });
    
    console.log(`Project deleted: ${projectResult.deletedCount} project(s), ${imagesResult.deletedCount} image(s)`);
    
    if (projectResult.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      deletedProject: projectResult.deletedCount,
      deletedImages: imagesResult.deletedCount 
    });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 });
  }
}
