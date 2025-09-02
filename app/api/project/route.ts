import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: false, error: 'Use /api/projects (plural) for project APIs' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Use /api/projects (plural) for project APIs' }, { status: 404 });
}
