import { v2 as cloudinary } from 'cloudinary';
import { ImageItem } from './types';

// Configure Cloudinary (this will use environment variables)
if (typeof window === 'undefined') {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
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
  const {
    width = 1200,
    height = 1600,
    quality = 'auto',
    format = 'png'
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'image',
    format: format,
    page: pageNumber - 1, // Cloudinary uses 0-based page indexing
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
    quality: 'auto:good'
  });
}

/**
 * Generate all page URLs for a PDF
 */
export function generatePdfPages(publicId: string, pageCount: number): PdfPageInfo[] {
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

// Client-side PDF.js functionality
let pdfjsLib: any = null;
let isInitialized = false;

export const initPdfJs = async () => {
  if (typeof window === 'undefined' || isInitialized) {
    return pdfjsLib;
  }

  try {
    // Dynamic import of pdfjs-dist
    pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    console.log('✅ PDF.js initialized successfully');
    isInitialized = true;
    
  } catch (error) {
    console.error('❌ PDF.js initialization failed:', error);
    isInitialized = false;
    throw new Error(`PDF.js initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return pdfjsLib;
};

export interface PdfToImageOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

// Create PDF page items without immediate conversion
export async function createPdfPageItems(file: File): Promise<ImageItem[]> {
  try {
    await initPdfJs();
    
    if (!pdfjsLib) {
      throw new Error('PDF.js not initialized');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    
    console.log(`📄 PDF loaded: ${pageCount} pages`);
    
    const items: ImageItem[] = [];
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      items.push({
        id: `pdf-page-${pageNum}-${Date.now()}`,
        name: `${file.name} - Page ${pageNum}`,
        width: 1200,
        height: 1600,
        url: '', // Will be set when page is rendered
        originalFormat: 'pdf',
        isPdfPage: true,
        pdfPageNumber: pageNum,
        originalPdfName: file.name,
        pdfArrayBuffer: arrayBuffer
      });
    }
    
    return items;
    
  } catch (error) {
    console.error('❌ Error creating PDF page items:', error);
    isInitialized = false;
    pdfjsLib = null;
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to convert PDF page to canvas (on-demand)
export async function renderPdfPageToCanvas(
  file: File, 
  pageNumber: number, 
  options: PdfToImageOptions = {}
): Promise<string> {
  const { scale = 2 } = options;
  
  try {
    await initPdfJs();
    
    if (!pdfjsLib) {
      throw new Error('PDF.js not initialized');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);
    
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    return canvas.toDataURL('image/png');
    
  } catch (error) {
    console.error(`❌ Error rendering PDF page ${pageNumber}:`, error);
    throw new Error(`Failed to render page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to validate PDF file
export function validatePdfFile(file: File): void {
  if (!file || file.size === 0) {
    throw new Error('Invalid or empty PDF file');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('PDF file is too large (max 50MB)');
  }
  
  if (file.type !== 'application/pdf') {
    throw new Error('File must be a PDF');
  }
}