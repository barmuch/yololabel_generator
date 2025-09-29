import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Only check environment variables without exposing sensitive data
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      CLOUDINARY_CLOUD_NAME: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      MONGODB_URI: !!process.env.MONGODB_URI,
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      timestamp: new Date().toISOString()
    };

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Environment check:', envCheck);
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment variables check completed'
    });

  } catch (error) {
    // Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error checking environment:', error);
    }
    return NextResponse.json({
      success: false,
      error: 'Environment check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
