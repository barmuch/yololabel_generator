import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getEnv } from '@/lib/env';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';

getEnv();

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, role } = body;
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username & password required' }, { status: 400 });
    }
    const userRole = role === 'admin' ? 'admin' : 'member';
    const db = await getDatabase();
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      return NextResponse.json({ success: false, error: 'User exists' }, { status: 409 });
    }
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = { id, username, role: userRole, passwordHash, createdAt: Date.now(), updatedAt: Date.now() };
    await db.collection('users').insertOne(userDoc);
    return NextResponse.json({ success: true, user: { id, username, role: userRole } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error creating user' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const db = await getDatabase();
  const users = await db.collection('users').find({}, { projection: { passwordHash: 0 } }).toArray();
  return NextResponse.json({ success: true, users });
}