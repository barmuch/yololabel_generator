import { v2 as cloudinary } from 'cloudinary';

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
 * @param publicId - Cloudinary public ID of the uploaded PDF
 * @param pageNumber - Page number (1-based)
 */
export function generatePdfThumbnailUrl(
  publicId: string, 
  pageNumber: number
): string {
  return generatePdfPageUrl(publicId, pageNumber, {
    width: 200,
    height: 280,
    quality: 'auto:low'
  });
}

/**
 * Generate all page URLs for a PDF
 * @param publicId - Cloudinary public ID of the uploaded PDF
 * @param pageCount - Total number of pages in the PDF
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
 * @param publicId - Cloudinary public ID of the uploaded PDF
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
        try {
          await pdfjsLib.getDocument({ data: testPdfData }).promise;
        } catch (testError) {
          // Expected to fail with invalid PDF, but should not crash
          if (testError instanceof Error && testError.message.includes('Invalid PDF')) {
            console.log('✅ PDF.js basic functionality test passed');
          } else {
            throw testError;
          }
        }
      } catch (testError) {
        console.error('❌ PDF.js functionality test failed:', testError);
        throw new Error('PDF.js is not functioning properly');
      }
      
      console.log('✅ PDF.js initialized successfully');
      isInitialized = true;
      
    } catch (error) {
      console.error('❌ PDF.js initialization failed:', error);
      isInitialized = false;
      throw new Error(`PDF.js initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return pdfjsLib;
};

export interface PdfToImageOptions {
  scale?: number; // Scale factor for rendering (default: 2 for high quality)
  format?: 'png' | 'jpeg'; // Output format (default: 'jpeg')
  quality?: number; // JPEG quality 0-1 (default: 0.9)
}

// New approach: Create PDF page items without immediate conversion
export async function createPdfPageItems(file: File): Promise<ImageItem[]> {
  // Retry mechanism for initialization
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📄 Creating PDF page items for: ${file.name} (attempt ${attempt}/${MAX_RETRIES})`);
      
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid or empty PDF file');
      }

      // Client-side validation for Vercel deployment limits
      if (file.size > 4.5 * 1024 * 1024) { // 4.5MB limit for Vercel
        const sizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
        throw new Error(`PDF file too large (${sizeMB}MB). Maximum size allowed is 4.5MB for Vercel deployment. Please use a smaller PDF file.`);
      }      // Initialize PDF.js with retry logic
      let pdfLib: any;
      try {
        pdfLib = await Promise.race([
          initPdfJs(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PDF.js initialization timeout')), 15000)
          )
        ]);
      } catch (initError) {
        if (attempt === MAX_RETRIES) {
          throw initError;
        }
        console.warn(`⚠️ PDF.js init failed on attempt ${attempt}, retrying...`, initError);
        // Reset initialization state for retry
        isInitialized = false;
        pdfjsLib = null;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      // Read PDF file with error handling
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch (error) {
        throw new Error(`Failed to read PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('PDF file appears to be empty or corrupted');
      }
      
      // Parse PDF document with multiple configuration attempts
      let pdf: any;
      const configStrategies = [
        // Strategy 1: Full features
        {
          data: arrayBuffer,
          isEvalSupported: false,
          disableFontFace: false,
          useSystemFonts: true,
        },
        // Strategy 2: Minimal features
        {
          data: arrayBuffer,
          isEvalSupported: false,
          disableFontFace: true,
          useSystemFonts: false,
        },
        // Strategy 3: Basic parsing only
        {
          data: arrayBuffer,
          isEvalSupported: false,
        }
      ];
      
      for (const [strategyIndex, config] of configStrategies.entries()) {
        try {
          console.log(`🔄 Trying PDF parse strategy ${strategyIndex + 1}/${configStrategies.length}`);
          
          const loadingTask = pdfLib.getDocument(config);
          
          pdf = await Promise.race([
            loadingTask.promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('PDF parsing timeout')), 20000)
            )
          ]);
          
          console.log(`✅ PDF parsing successful with strategy ${strategyIndex + 1}`);
          break;
          
        } catch (parseError) {
          console.warn(`⚠️ PDF parse strategy ${strategyIndex + 1} failed:`, parseError);
          if (strategyIndex === configStrategies.length - 1) {
            throw new Error(`Failed to parse PDF after ${configStrategies.length} strategies: ${parseError instanceof Error ? parseError.message : 'Invalid PDF format'}`);
          }
        }
      }
      
      const numPages = pdf.numPages;
      
      if (numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      if (numPages > 100) {
        throw new Error(`PDF has too many pages (${numPages}). Maximum 100 pages allowed.`);
      }
      
      console.log(`📊 PDF has ${numPages} pages`);
      
      const images: ImageItem[] = [];
      const originalName = file.name.replace(/\.pdf$/i, '');
      
      // Create blob URL for the PDF file (we'll use this for rendering later)
      const blobUrl = URL.createObjectURL(file);
      
      // Get page dimensions for metadata
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          
          const pageFileName = `${originalName}_page_${pageNum.toString().padStart(3, '0')}.pdf`;
          
          const imageItem: ImageItem = {
            id: `pdf_page_${Date.now()}_${pageNum}_${Math.random().toString(36).substr(2, 9)}`,
            name: pageFileName,
            width: Math.round(viewport.width),
            height: Math.round(viewport.height),
            blobUrl,
            url: blobUrl,
            status: 'new',
            originalFormat: 'pdf',
            isPdfPage: true,
            pdfPageNumber: pageNum,
            originalPdfName: file.name,
    if (!file || file.size === 0) {
      throw new Error('Invalid or empty PDF file');
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('PDF file too large (max 50MB)');
    }
    
    // Initialize PDF.js with timeout
    const pdfLib = await Promise.race([
      initPdfJs(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF.js initialization timeout')), 10000)
      )
    ]) as any;
    
    // Read PDF file with error handling
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (error) {
      throw new Error(`Failed to read PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('PDF file appears to be empty or corrupted');
    }
    
    // Parse PDF document
    let pdf: any;
    try {
      const loadingTask = pdfLib.getDocument({ 
        data: arrayBuffer,
        isEvalSupported: false, // Disable eval for security
        disableFontFace: false, // Keep fonts enabled
        nativeImageDecoderSupport: 'display', // Use native image decoding
      });
      
      pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF parsing timeout')), 15000)
        )
      ]);
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Invalid PDF format'}`);
    }
    
    const numPages = pdf.numPages;
    
    if (numPages === 0) {
      throw new Error('PDF has no pages');
    }
    
    if (numPages > 100) {
      throw new Error(`PDF has too many pages (${numPages}). Maximum 100 pages allowed.`);
    }
    
    console.log(`PDF has ${numPages} pages`);
    
    const images: ImageItem[] = [];
    const originalName = file.name.replace(/\.pdf$/i, '');
    
    // Create blob URL for the PDF file (we'll use this for rendering later)
    const blobUrl = URL.createObjectURL(file);
    
    // Get page dimensions for metadata
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        
        const pageFileName = `${originalName}_page_${pageNum.toString().padStart(3, '0')}.pdf`;
        
        const imageItem: ImageItem = {
          id: `pdf_page_${Date.now()}_${pageNum}_${Math.random().toString(36).substr(2, 9)}`,
          name: pageFileName,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          blobUrl,
          url: blobUrl,
          status: 'new',
          originalFormat: 'pdf',
          isPdfPage: true,
          pdfPageNumber: pageNum,
          originalPdfName: file.name,
          pdfArrayBuffer: arrayBuffer, // Store PDF data for later rendering
        };
        
        images.push(imageItem);
        
        console.log(`Created PDF page item ${pageNum}/${numPages}: ${pageFileName}`);
        
      } catch (error) {
        console.error(`Error processing page ${pageNum}:`, error);
        // Continue with other pages even if one fails
      }
    }
    
    console.log(`Successfully created ${images.length} PDF page items`);
    return images;
    
  } catch (error) {
    console.error('Error creating PDF page items:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to render a specific PDF page to canvas (for display in CanvasStage)
export async function renderPdfPageToCanvas(
  imageItem: ImageItem,
  canvas: HTMLCanvasElement,
  scale: number = 1
): Promise<void> {
  if (!imageItem.isPdfPage || !imageItem.pdfArrayBuffer) {
    throw new Error('Not a PDF page item');
  }
  
  try {
    const pdfLib = await initPdfJs();
    
    // Parse PDF document with better error handling
    const pdf = await pdfLib.getDocument({ 
      data: imageItem.pdfArrayBuffer,
      isEvalSupported: false,
      disableFontFace: false,
      nativeImageDecoderSupport: 'display',
    }).promise;
    
    const page = await pdf.getPage(imageItem.pdfPageNumber!);
    const viewport = page.getViewport({ scale });
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Clear canvas and set dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };
    
    // Render with timeout
    await Promise.race([
      page.render(renderContext).promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF render timeout')), 10000)
      )
    ]);
    
    console.log(`Rendered PDF page ${imageItem.pdfPageNumber} to canvas`);
    
  } catch (error) {
    console.error('Error rendering PDF page to canvas:', error);
    throw new Error(`Failed to render PDF page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to convert PDF page to image blob (for export only)
export async function convertPdfPageToImageBlob(
  imageItem: ImageItem,
  options: PdfToImageOptions = {}
): Promise<Blob> {
  const {
    scale = 2,
    format = 'jpeg',
    quality = 0.9
  } = options;
  
  if (!imageItem.isPdfPage || !imageItem.pdfArrayBuffer) {
    throw new Error('Not a PDF page item');
  }
  
  try {
    const pdfLib = await initPdfJs();
    
    // Parse PDF document with better error handling
    const pdf = await pdfLib.getDocument({ 
      data: imageItem.pdfArrayBuffer,
      isEvalSupported: false,
      disableFontFace: false,
      nativeImageDecoderSupport: 'display',
    }).promise;
    
    const page = await pdf.getPage(imageItem.pdfPageNumber!);
    const viewport = page.getViewport({ scale });
    
    // Create temporary canvas for conversion
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Fill white background for JPEG format
    if (format === 'jpeg') {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };
    
    // Render with timeout
    await Promise.race([
      page.render(renderContext).promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF render timeout')), 10000)
      )
    ]);
    
    // Convert canvas to blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        quality
      );
    });
    
  } catch (error) {
    console.error('Error converting PDF page to image blob:', error);
    throw error;
  }
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function getImageFormatFromImageItem(imageItem: ImageItem): 'jpg' | 'png' {
  // For YOLO training, prefer JPG for smaller file sizes
  if (imageItem.originalFormat === 'pdf') {
    return 'jpg';
  }
  
  // Check existing format
  const format = imageItem.cloudinary?.format || imageItem.name.split('.').pop()?.toLowerCase();
  
  switch (format) {
    case 'png':
    case 'gif':
    case 'webp':
      return 'png';
    case 'jpg':
    case 'jpeg':
    default:
      return 'jpg';
  }
}

export async function convertImageToYoloFormat(imageItem: ImageItem): Promise<Blob> {
  const targetFormat = getImageFormatFromImageItem(imageItem);
  
  try {
    // If it's a PDF page, convert it using PDF.js
    if (imageItem.isPdfPage) {
      return await convertPdfPageToImageBlob(imageItem, {
        scale: 2,
        format: targetFormat === 'jpg' ? 'jpeg' : 'png',
        quality: 0.9
      });
    }
    
    // If it's already in the right format and from a reliable source, use it directly
    if (targetFormat === 'jpg' && imageItem.cloudinary?.secure_url) {
      const response = await fetch(imageItem.cloudinary.secure_url);
      return await response.blob();
    }
    
    // Otherwise, convert via canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // For JPG, fill with white background to avoid transparency issues
        if (targetFormat === 'jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          },
          targetFormat === 'jpg' ? 'image/jpeg' : 'image/png',
          0.9 // High quality for training
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for conversion'));
      };
      
      img.src = imageItem.url;
    });
    
  } catch (error) {
    console.error('Error converting image to YOLO format:', error);
    throw error;
  }
}
