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
    
    // Check if any projects are using this class set
    const projectsUsingClassSet = await db
      .collection<ProjectDocument>('projects')
      .countDocuments({ classSetId: params.id });

    if (projectsUsingClassSet > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete class set. ${projectsUsingClassSet} project(s) are using it.`,
          projectCount: projectsUsingClassSet
        },
        { status: 400 }
      );
    }

    const result = await db
      .collection<ClassSetDocument>('classSets')
      .deleteOne({ id: params.id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Class set not found' },
        { status: 404 }
      );
    }

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
