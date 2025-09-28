import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getEnv } from '@/lib/env';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';

getEnv();

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, role } = body;
    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 });
    }
    
    const userRole = role === 'admin' ? 'admin' : 'member';
    const db = await getDatabase();
    
    // Check if username already exists (but not for current user)
    const existing = await db.collection('users').findOne({ 
      username, 
      id: { $ne: params.id } 
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 409 });
    }
    
    const updateData: any = { 
      username, 
      role: userRole, 
      updatedAt: Date.now() 
    };
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    
    const result = await db.collection('users').updateOne(
      { id: params.id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Error updating user' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();
    
    // Don't allow deleting yourself
    if (token.sub === params.id) {
      return NextResponse.json({ success: false, error: 'Cannot delete yourself' }, { status: 400 });
    }
    
    const result = await db.collection('users').deleteOne({ id: params.id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Error deleting user' 
    }, { status: 500 });
  }
}