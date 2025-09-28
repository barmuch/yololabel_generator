import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { getEnv } from '@/lib/env';

// One-time bootstrap route: creates an admin if none exists yet.
// Protect by requiring no existing admin and providing a shared secret via query param (?secret=...)

export async function POST(req: NextRequest) {
  try {
    const env = getEnv();
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const bootstrapSecret = env.BOOTSTRAP_SECRET || process.env.BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
      return NextResponse.json({ success: false, error: 'No BOOTSTRAP_SECRET set' }, { status: 500 });
    }
    if (secret !== bootstrapSecret) {
      return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 403 });
    }
    const db = await getDatabase();
    const existingAdmin = await db.collection('users').findOne({ role: 'admin' });
    if (existingAdmin) {
      return NextResponse.json({ success: false, error: 'Admin already exists' }, { status: 409 });
    }
    const { username = 'admin', password = 'Admin123!' } = await req.json().catch(()=>({}));
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = { id, username, role: 'admin', passwordHash, createdAt: Date.now(), updatedAt: Date.now() };
    await db.collection('users').insertOne(userDoc);
    return NextResponse.json({ success: true, admin: { username, password } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
