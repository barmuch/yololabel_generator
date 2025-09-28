import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getEnv } from '@/lib/env';

// Development-only endpoint to reset admin users
export async function POST(req: NextRequest) {
  try {
    const env = getEnv();
    if (env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Not available in production' }, { status: 403 });
    }
    
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const bootstrapSecret = env.BOOTSTRAP_SECRET || process.env.BOOTSTRAP_SECRET;
    if (!bootstrapSecret || secret !== bootstrapSecret) {
      return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 403 });
    }
    
    const db = await getDatabase();
    const result = await db.collection('users').deleteMany({ role: 'admin' });
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}