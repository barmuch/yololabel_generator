import { ImageItem } from './types';

// Lazy import PDF.js only on client-side
let pdfjsLib: any = null;

// Initialize PDF.js only on client-side
const initPdfJs = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing is only available on the client-side');
  }
  
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Set up PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  
  return pdfjsLib;
};

export interface PdfToImageOptions {
  scale?: number; // Scale factor for rendering (default: 2 for high quality)
  format?: 'png' | 'jpeg'; // Output format (default: 'jpeg')
  quality?: number; // JPEG quality 0-1 (default: 0.9)
}

export async function convertPdfToImages(
  file: File,
  options: PdfToImageOptions = {}
): Promise<ImageItem[]> {
  const {
    scale = 2,
    format = 'jpeg',
    quality = 0.9
  } = options;

  try {
    console.log('Converting PDF to images:', file.name);
    
    // Initialize PDF.js
    const pdfLib = await initPdfJs();
    
    // Read PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    console.log(`PDF has ${numPages} pages`);
    
    const images: ImageItem[] = [];
    
    // Convert each page to image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
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
        
        // Create image item
        const blobUrl = URL.createObjectURL(blob);
        const originalName = file.name.replace(/\.pdf$/i, '');
        const pageFileName = `${originalName}_page_${pageNum.toString().padStart(3, '0')}.${format}`;
        
        const imageItem: ImageItem = {
          id: `pdf_page_${Date.now()}_${pageNum}_${Math.random().toString(36).substr(2, 9)}`,
          name: pageFileName,
          width: viewport.width,
          height: viewport.height,
          blobUrl,
          url: blobUrl,
          status: 'new',
          originalFormat: 'pdf',
          isPdfPage: true,
          pdfPageNumber: pageNum,
          originalPdfName: file.name
        };
        
        images.push(imageItem);
        
        console.log(`Converted page ${pageNum}/${numPages}: ${pageFileName}`);
        
      } catch (error) {
        console.error(`Error converting page ${pageNum}:`, error);
        // Continue with other pages even if one fails
      }
    }
    
    console.log(`Successfully converted ${images.length} pages from PDF`);
    return images;
    
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error(`Failed to convert PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // If it's already in the right format and from a reliable source, use it directly
    if (!imageItem.isPdfPage && targetFormat === 'jpg' && imageItem.cloudinary?.secure_url) {
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
