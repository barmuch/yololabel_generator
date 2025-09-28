import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST() {
  const db = await getDatabase();
  const existingAdmin = await db.collection('users').findOne({ role: 'admin' });
  if (existingAdmin) {
    return NextResponse.json({ success: true, message: 'Admin already exists' });
  }
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  await db.collection('users').insertOne({
    id,
    email: 'admin@example.com',
    role: 'admin',
    name: 'Administrator',
    passwordHash,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return NextResponse.json({ success: true, admin: { email: 'admin@example.com', password: 'Admin123!' } });
}