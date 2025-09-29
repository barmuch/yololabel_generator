import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ClassSetDocument, ProjectDocument } from '@/lib/schemas';

// POST /api/class-sets/refresh-counts - Refresh project counts for all class sets
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Refreshing project counts for all class sets...');
    
    const { db } = await connectToDatabase();
    
    // Get all class sets
    const classSets = await db
      .collection<ClassSetDocument>('classSets')
      .find({})
      .toArray();
    
    const updates = [];
    
    for (const classSet of classSets) {
      // Count actual projects using this class set
      const actualProjectCount = await db
        .collection<ProjectDocument>('projects')
        .countDocuments({ classSetId: classSet.id });
      
      if (classSet.projectCount !== actualProjectCount) {
        console.log(`📊 ${classSet.name}: ${classSet.projectCount} → ${actualProjectCount}`);
        
        // Update the count
        await db
          .collection<ClassSetDocument>('classSets')
          .updateOne(
            { id: classSet.id },
            { $set: { projectCount: actualProjectCount } }
          );
          
        updates.push({
          id: classSet.id,
          name: classSet.name,
          oldCount: classSet.projectCount,
          newCount: actualProjectCount
        });
      }
    }
    
    console.log(`✅ Updated ${updates.length} class sets`);
    
    return NextResponse.json({
      success: true,
      message: `Updated project counts for ${updates.length} class sets`,
      updates
    });
    
  } catch (error) {
    console.error('Error refreshing project counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh project counts' },
      { status: 500 }
    );
  }
}

// GET /api/class-sets/refresh-counts - Check current counts without updating
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Get all class sets with their current counts
    const classSets = await db
      .collection<ClassSetDocument>('classSets')
      .find({})
      .toArray();
    
    const analysis = [];
    
    for (const classSet of classSets) {
      const actualProjectCount = await db
        .collection<ProjectDocument>('projects')
        .countDocuments({ classSetId: classSet.id });
      
      const projects = await db
        .collection<ProjectDocument>('projects')
        .find({ classSetId: classSet.id }, { projection: { id: 1, name: 1 } })
        .toArray();
      
      analysis.push({
        id: classSet.id,
        name: classSet.name,
        storedCount: classSet.projectCount,
        actualCount: actualProjectCount,
        needsUpdate: classSet.projectCount !== actualProjectCount,
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      });
    }
    
    return NextResponse.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    console.error('Error checking project counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check project counts' },
      { status: 500 }
    );
  }
}