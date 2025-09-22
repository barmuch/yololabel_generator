// Configure Cloudinary (this will use environment variables) - Server only
let cloudinary: any = null;

if (typeof window === 'undefined') {
  try {
    const { v2 } = require('cloudinary');
    cloudinary = v2;
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } catch (error) {
    console.warn('Cloudinary not available:', error);
  }
}

export interface PdfPageInfo {
  pageNumber: number;
  url: string;
  thumbnailUrl: string;
}

/**
 * Generate PNG URL for a specific PDF page using Cloudinary transformation
 */
export function generatePdfPageUrl(
  publicId: string, 
  pageNumber: number, 
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}
): string {
  if (!cloudinary) {
    // Client-side fallback - return placeholder or throw error
    throw new Error('PDF processing only available on server-side');
  }

  const {
    width = 1200,
    height = 1600,
    quality = 'auto',
    format = 'png'
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'image',
    format: format,
    page: pageNumber - 1,
    width: width,
    height: height,
    quality: quality,
    crop: 'fit',
    background: 'white'
  });
}

/**
 * Generate thumbnail URL for a specific PDF page
 */
export function generatePdfThumbnailUrl(publicId: string, pageNumber: number): string {
  return generatePdfPageUrl(publicId, pageNumber, {
    width: 200,
    height: 280,
    quality: 'auto:low'
  });
}

/**
 * Generate all page URLs for a PDF
 */
export function generateAllPdfPageUrls(
  publicId: string, 
  pageCount: number
): PdfPageInfo[] {
  const pages: PdfPageInfo[] = [];
  
  for (let i = 1; i <= pageCount; i++) {
    pages.push({
      pageNumber: i,
      url: generatePdfPageUrl(publicId, i),
      thumbnailUrl: generatePdfThumbnailUrl(publicId, i)
    });
  }
  
  return pages;
}

/**
 * Get PDF information from Cloudinary (server-side only)
 */
export async function getPdfInfo(publicId: string) {
  if (typeof window !== 'undefined') {
    throw new Error('getPdfInfo can only be called on the server-side');
  }
  
  if (!cloudinary) {
    throw new Error('Cloudinary not configured');
  }
  
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
      pages: true
    });
    
    return {
      pageCount: result.pages || 1,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      url: result.secure_url
    };
  } catch (error) {
    console.error('Error getting PDF info:', error);
    throw new Error('Failed to get PDF information');
  }
}