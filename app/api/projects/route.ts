import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ProjectDocument, ClassSetDocument } from '@/lib/schemas';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Fetching all projects from MongoDB...');
    }
    
    const db = await getDatabase();
    
    // Get all projects with their image and annotation counts
    const projects = await db.collection('projects').find({}).sort({ updatedAt: -1 }).toArray();
    
    // Update image and annotation counts for each project, and populate class sets
    const projectsWithCounts = await Promise.all(
      projects.map(async (project: any) => {
        const imageCount = await db.collection('images').countDocuments({ projectId: project.id });
        const annotationCount = await db.collection('annotations').countDocuments({ projectId: project.id });
        
        // If project uses a shared class set, populate it
        let classSet = null;
        if (project.classSetId) {
          classSet = await db.collection<ClassSetDocument>('classSets').findOne({ id: project.classSetId });
        }
        
        return {
          ...project,
          imageCount,
          annotationCount,
          classSet: classSet ? {
            id: classSet.id,
            name: classSet.name,
            description: classSet.description,
            classes: classSet.classes,
            createdAt: classSet.createdAt,
            updatedAt: classSet.updatedAt,
            projectCount: classSet.projectCount,
            isDefault: classSet.isDefault || false
          } : null
        };
      })
    );
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Found ${projectsWithCounts.length} projects in MongoDB`);
    }
    
    return NextResponse.json({
      success: true,
      projects: projectsWithCounts
    });
    
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Creating/updating project in MongoDB:', projectData.name);
    }
    
    const db = await getDatabase();
    
    // Prepare project document
    const projectDoc: ProjectDocument = {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description || '',
      createdAt: projectData.createdAt || Date.now(),
      updatedAt: Date.now(),
      imageCount: projectData.imageCount || 0,
      annotationCount: projectData.annotationCount || 0
    };

    // Handle class management - either shared class set or embedded classes
    if (projectData.classSetId) {
      projectDoc.classSetId = projectData.classSetId;
      
      // Update the class set usage count
      await db.collection<ClassSetDocument>('classSets').updateOne(
        { id: projectData.classSetId },
        { $inc: { projectCount: 1 } }
      );
    } else {
      projectDoc.classes = projectData.classes || [];
    }
    
    // Use upsert to handle both create and update
    const result = await db.collection('projects').replaceOne(
      { id: projectData.id },
      projectDoc,
      { upsert: true }
    );
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Project saved: ${result.upsertedId ? 'created' : 'updated'}`);
    }
    
    return NextResponse.json({
      success: true,
      project: { ...projectDoc, _id: result.upsertedId }
    });
    
  } catch (error) {
    console.error('❌ Error saving project:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project'
    }, { status: 500 });
  }
}
