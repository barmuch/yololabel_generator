import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ClassSetDocument, ProjectDocument } from '@/lib/schemas';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/class-sets/[id] - Get specific class set
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await connectToDatabase();
    
    const classSet = await db
      .collection<ClassSetDocument>('classSets')
      .findOne({ id: params.id });

    if (!classSet) {
      return NextResponse.json(
        { success: false, error: 'Class set not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      classSet: {
        id: classSet.id,
        name: classSet.name,
        description: classSet.description,
        classes: classSet.classes,
        createdAt: classSet.createdAt,
        updatedAt: classSet.updatedAt,
        projectCount: classSet.projectCount,
        isDefault: classSet.isDefault || false
      }
    });
  } catch (error) {
    console.error('Error fetching class set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch class set' },
      { status: 500 }
    );
  }
}

// PUT /api/class-sets/[id] - Update class set (affects all linked projects)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { name, description, classes } = body;

    if (!name || !classes || !Array.isArray(classes)) {
      return NextResponse.json(
        { success: false, error: 'Name and classes are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Update the class set
    const updatedClassSet = await db
      .collection<ClassSetDocument>('classSets')
      .findOneAndUpdate(
        { id: params.id },
        {
          $set: {
            name: name.trim(),
            description: description?.trim(),
            classes: classes.map((cls: any, index: number) => ({
              id: String(index),
              name: cls.name,
              color: cls.color
            })),
            updatedAt: Date.now()
          }
        },
        { returnDocument: 'after' }
      );

    if (!updatedClassSet) {
      return NextResponse.json(
        { success: false, error: 'Class set not found' },
        { status: 404 }
      );
    }

    // Note: Projects using this class set will automatically get updated classes
    // when they fetch the project data (since they reference by classSetId)

    return NextResponse.json({
      success: true,
      classSet: {
        id: updatedClassSet.id,
        name: updatedClassSet.name,
        description: updatedClassSet.description,
        classes: updatedClassSet.classes,
        createdAt: updatedClassSet.createdAt,
        updatedAt: updatedClassSet.updatedAt,
        projectCount: updatedClassSet.projectCount,
        isDefault: updatedClassSet.isDefault || false
      }
    });
  } catch (error) {
    console.error('Error updating class set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update class set' },
      { status: 500 }
    );
  }
}

// DELETE /api/class-sets/[id] - Delete class set (only if no projects use it)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await connectToDatabase();
    
    console.log(`🗑️ Attempting to delete class set: ${params.id}`);
    
    // First, get current class set info
    const classSet = await db
      .collection<ClassSetDocument>('classSets')
      .findOne({ id: params.id });
      
    if (!classSet) {
      return NextResponse.json(
        { success: false, error: 'Class set not found' },
        { status: 404 }
      );
    }
    
    console.log(`📊 Current stored project count: ${classSet.projectCount}`);
    
    // Check actual projects using this class set
    const projectsUsingClassSet = await db
      .collection<ProjectDocument>('projects')
      .countDocuments({ classSetId: params.id });
      
    console.log(`🔍 Actual projects found in database: ${projectsUsingClassSet}`);
    
    // Update the project count in class set to match reality
    if (classSet.projectCount !== projectsUsingClassSet) {
      console.log(`🔄 Updating project count from ${classSet.projectCount} to ${projectsUsingClassSet}`);
      await db
        .collection<ClassSetDocument>('classSets')
        .updateOne(
          { id: params.id },
          { $set: { projectCount: projectsUsingClassSet } }
        );
    }

    if (projectsUsingClassSet > 0) {
      const projects = await db
        .collection<ProjectDocument>('projects')
        .find({ classSetId: params.id }, { projection: { id: 1, name: 1 } })
        .toArray();
        
      console.log(`❌ Projects still using this class set:`, projects.map(p => `${p.name} (${p.id})`));
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete class set. ${projectsUsingClassSet} project(s) are still using it.`,
          projectCount: projectsUsingClassSet,
          projects: projects.map(p => ({ id: p.id, name: p.name }))
        },
        { status: 400 }
      );
    }

    console.log(`✅ No projects using class set, proceeding with deletion`);
    
    const result = await db
      .collection<ClassSetDocument>('classSets')
      .deleteOne({ id: params.id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Class set not found' },
        { status: 404 }
      );
    }
    
    console.log(`🎉 Class set deleted successfully: ${classSet.name}`);

    return NextResponse.json({
      success: true,
      message: 'Class set deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete class set' },
      { status: 500 }
    );
  }
}
