// Configure Cloudinary URL helper (client-side safe)
// Uses NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME from environment

export interface PdfPageInfo {
  pageNumber: number;
  url: string;
  thumbnailUrl: string;
}

/**
 * Generate PNG URL for a specific PDF page using Cloudinary transformation
 * @param publicId - Cloudinary public ID of the uploaded PDF
 * @param pageNumber - Page number (1-based)
 * @param options - Additional options for the transformation
 */
export function generatePdfPageUrl(
  publicId: string, 
  pageNumber: number, 
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    preserveAspectRatio?: boolean;
  } = {}
): string {
  const {
    width,
    height,
    quality = 'auto:best',
    format = 'png',
    preserveAspectRatio = true
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured');
  }

  // Build basic transformations - keep it simple
  const transformations = [
    `f_${format}`,
    `pg_${pageNumber}`, // Cloudinary uses 1-based page indexing for PDFs
    `q_${quality}`
  ];

  // Add dimensions if specified
  if (width) {
    transformations.push(`w_${width}`);
  }
  if (height) {
    transformations.push(`h_${height}`);
  }

  // Add crop mode
  if (preserveAspectRatio) {
    transformations.push('c_fit');
  } else {
    transformations.push('c_fill');
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${publicId}`;
}

/**
 * Generate thumbnail URL for a specific PDF page
 * @param publicId - Cloudinary public ID of the uploaded PDF
 * @param pageNumber - Page number (1-based)
 */
export function generatePdfThumbnailUrl(
  publicId: string, 
  pageNumber: number
): string {
  return generatePdfPageUrl(publicId, pageNumber, {
    width: 200,
    quality: 'auto:low',
    preserveAspectRatio: true
  });
}

/**
 * Generate all page URLs for a PDF
 * @param publicId - Cloudinary public ID of the uploaded PDF
 * @param pageCount - Total number of pages in the PDF
 * @param options - Optional transformation settings
 */
export function generateAllPdfPageUrls(
  publicId: string, 
  pageCount: number,
  options?: {
    width?: number;
    height?: number;
    quality?: 'auto:best' | 'auto:good' | 'auto:low' | 'auto';
    preserveAspectRatio?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  }
): PdfPageInfo[] {
  const pages: PdfPageInfo[] = [];
  
  for (let i = 1; i <= pageCount; i++) {
    pages.push({
      pageNumber: i,
      url: generatePdfPageUrl(publicId, i, options || {
        width: 1600, // Higher resolution for canvas
        quality: 'auto:best',
        preserveAspectRatio: true
      }),
      thumbnailUrl: generatePdfThumbnailUrl(publicId, i)
    });
  }
  
  return pages;
}

/**
 * Generate high-resolution URL for export
 * @param publicId - Cloudinary public ID of the uploaded PDF
 * @param pageNumber - Page number (1-based)
 * @param exportWidth - Target width for export (optional)
 */
export function generatePdfExportUrl(
  publicId: string, 
  pageNumber: number,
  exportWidth?: number
): string {
  return generatePdfPageUrl(publicId, pageNumber, {
    width: exportWidth || 2400, // Very high resolution for export
    quality: 'auto:best',
    preserveAspectRatio: true
  });
}
