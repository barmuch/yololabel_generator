import { ImageItem } from './types';

// Lazy import React-PDF components only on client-side
let Document: any, Page: any, pdfjs: any;

export interface PdfToImageOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

const initReactPdf = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing is only available on the client-side');
  }
  
  if (!Document || !Page || !pdfjs) {
    try {
      console.log('🔧 Initializing React-PDF...');
      
      // Dynamic import React-PDF
      const reactPdf = await import('react-pdf');
      Document = reactPdf.Document;
      Page = reactPdf.Page;
      pdfjs = reactPdf.pdfjs;
      
      // Set worker with local package first, then fallback strategies
      const workerStrategies = [
        new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString(),
        `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
        '//unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js',
        '//cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js'
      ];
      
      for (const workerSrc of workerStrategies) {
        try {
          console.log(`🔄 Trying worker: ${workerSrc}`);
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
          
          // Test if worker is accessible
          const testResponse = await fetch(`https:${workerSrc}`, { method: 'HEAD' });
          if (testResponse.ok) {
            console.log(`✅ Worker set successfully: ${workerSrc}`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Worker failed: ${workerSrc}`, error);
          continue;
        }
      }
      
      console.log('✅ React-PDF initialized successfully');
      
    } catch (error) {
      console.error('❌ React-PDF initialization failed:', error);
      throw new Error(`React-PDF initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Create PDF page items using React-PDF approach
export async function createPdfPageItems(file: File): Promise<ImageItem[]> {
  try {
    console.log('📄 Creating PDF page items using React-PDF for:', file.name);
    
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid or empty PDF file');
    }

    // Client-side validation for Vercel deployment limits
    if (file.size > 4.5 * 1024 * 1024) { // 4.5MB limit for Vercel
      const sizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
      throw new Error(`PDF file too large (${sizeMB}MB). Maximum size allowed is 4.5MB for Vercel deployment. Please use a smaller PDF file.`);
    }    // Initialize React-PDF
    await initReactPdf();
    
    // Read PDF file
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('PDF file appears to be empty or corrupted');
    }
    
    // Create a blob URL for the PDF
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Get PDF info using direct pdfjs call
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
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
    
    // Create items for each page
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
          blobUrl: pdfUrl,
          url: pdfUrl,
          status: 'new',
          originalFormat: 'pdf',
          isPdfPage: true,
          pdfPageNumber: pageNum,
          originalPdfName: file.name,
          pdfArrayBuffer: arrayBuffer,
        };
        
        images.push(imageItem);
        console.log(`✅ Created PDF page item ${pageNum}/${numPages}: ${pageFileName}`);
        
      } catch (pageError) {
        console.error(`❌ Error processing page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    if (images.length === 0) {
      throw new Error('No pages could be processed from the PDF');
    }
    
    console.log(`✅ Successfully created ${images.length} PDF page items using React-PDF`);
    return images;
    
  } catch (error) {
    console.error('❌ Error creating PDF page items with React-PDF:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Render PDF page to canvas using DOM approach
export async function renderPdfPageToCanvas(
  imageItem: ImageItem,
  canvas: HTMLCanvasElement,
  scale: number = 1
): Promise<void> {
  if (!imageItem.isPdfPage || !imageItem.pdfArrayBuffer) {
    throw new Error('Not a PDF page item');
  }
  
  try {
    console.log(`🎨 Rendering PDF page ${imageItem.pdfPageNumber} to canvas using React-PDF`);
    
    await initReactPdf();
    
    // Create temporary container for React-PDF rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    
    try {
      // Use pdfjs directly for rendering
      const loadingTask = pdfjs.getDocument({ data: imageItem.pdfArrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(imageItem.pdfPageNumber!);
      const viewport = page.getViewport({ scale });
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      console.log(`✅ Rendered PDF page ${imageItem.pdfPageNumber} to canvas`);
      
    } finally {
      // Clean up temporary container
      document.body.removeChild(tempContainer);
    }
    
  } catch (error) {
    console.error('❌ Error rendering PDF page to canvas:', error);
    throw new Error(`Failed to render PDF page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Convert PDF page to image blob for export
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
    console.log(`🔄 Converting PDF page ${imageItem.pdfPageNumber} to ${format} blob`);
    
    await initReactPdf();
    
    // Use pdfjs to render to a temporary canvas
    const loadingTask = pdfjs.getDocument({ data: imageItem.pdfArrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(imageItem.pdfPageNumber!);
    const viewport = page.getViewport({ scale });
    
    // Create temporary canvas
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
    };
    
    await page.render(renderContext).promise;
    
    // Convert canvas to blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`✅ Converted PDF page ${imageItem.pdfPageNumber} to ${format} blob`);
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
    console.error('❌ Error converting PDF page to image blob:', error);
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
    // If it's a PDF page, convert it using React-PDF
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
    console.error('❌ Error converting image to YOLO format:', error);
    throw error;
  }
}
