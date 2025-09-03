import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('=== UPLOAD TEST DEBUG ===');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set');

    // Minimal 1x1 PNG base64
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        { resource_type: 'image' },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });

    console.log('Upload test success:', (result as any)?.public_id);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Upload test error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
