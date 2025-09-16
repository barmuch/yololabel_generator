import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ClassSetDocument } from '@/lib/schemas';
import { v4 as uuidv4 } from 'uuid';

// GET /api/class-sets - Get all available class sets
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    const classSets = await db
      .collection<ClassSetDocument>('classSets')
      .find({})
      .sort({ projectCount: -1, isDefault: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      classSets: classSets.map(set => ({
        id: set.id,
        name: set.name,
        description: set.description,
        classes: set.classes,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        projectCount: set.projectCount,
        isDefault: set.isDefault || false
      }))
    });
  } catch (error) {
    console.error('Error fetching class sets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch class sets' },
      { status: 500 }
    );
  }
}

// POST /api/class-sets - Create new class set
export async function POST(request: NextRequest) {
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
    
    const classSetId = uuidv4();
    const now = Date.now();

    const classSetDoc: ClassSetDocument = {
      id: classSetId,
      name: name.trim(),
      description: description?.trim(),
      classes: classes.map((cls: any, index: number) => ({
        id: String(index),
        name: cls.name,
        color: cls.color
      })),
      createdAt: now,
      updatedAt: now,
      projectCount: 0,
      isDefault: false
    };

    await db.collection<ClassSetDocument>('classSets').insertOne(classSetDoc);

    return NextResponse.json({
      success: true,
      classSet: {
        id: classSetDoc.id,
        name: classSetDoc.name,
        description: classSetDoc.description,
        classes: classSetDoc.classes,
        createdAt: classSetDoc.createdAt,
        updatedAt: classSetDoc.updatedAt,
        projectCount: classSetDoc.projectCount,
        isDefault: classSetDoc.isDefault
      }
    });
  } catch (error) {
    console.error('Error creating class set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create class set' },
      { status: 500 }
    );
  }
}
