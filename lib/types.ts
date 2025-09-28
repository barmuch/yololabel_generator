// Core types for YOLO Label Generator

export type ImageItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  blobUrl?: string; // Optional for backwards compatibility
  cloudinary?: {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    originalWidth?: number; // Original dimensions before scaling
    originalHeight?: number;
    orientation?: string; // portrait, landscape, square
  };
  url: string; // Main URL to use (either blobUrl or cloudinary.secure_url)
  status?: "new" | "labeled";
  originalFormat?: string; // Track if converted from PDF
  isPdfPage?: boolean; // Flag to indicate this is a PDF page
  pdfPageNumber?: number; // Page number if from PDF
  originalPdfName?: string; // Original PDF filename
  pdfArrayBuffer?: ArrayBuffer; // Store PDF data for client-side rendering
  // Optional slice metadata when image was produced by tiling a larger source
  slice?: {
    parent: string;          // original (unsliced) filename
    suffix: string;          // e.g. _tile_001
    index?: number;          // zero-based index
    x?: number;              // left offset in original image
    y?: number;              // top offset
    w?: number;              // tile width
    h?: number;              // tile height
    originalWidth?: number;  // full original width
    originalHeight?: number; // full original height
  };
};

export type BBox = {
  id: string;
  imageId: string;
  classId: number;
  x: number;  // pixels
  y: number;  // pixels
  w: number;  // pixels
  h: number;  // pixels
  locked?: boolean;
  hidden?: boolean;
};

export type ClassDef = {
  id: number;
  name: string;
  color: string;
};

export type ClassSet = {
  id: string;
  name: string;
  description?: string;
  classes: ClassDef[];
  createdAt: number;
  updatedAt: number;
  projectCount: number;
  isDefault?: boolean;
};

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  images: ImageItem[];
  bboxes: BBox[];
  
  // Class management - either use shared set or embedded classes
  classSetId?: string; // If using shared class set
  classSet?: ClassSet; // Populated class set data
  classes?: ClassDef[]; // Embedded classes (if not using shared)
  
  // Server-provided counts (from API)
  imageCount?: number;
  annotationCount?: number;
};

export type ExportOptions = {
  includeDataYaml: boolean;
  trainSplit: number;
  valSplit: number;
  testSplit: number;
  splitMethod: 'random' | 'sequential';
};

export type ViewportState = {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasMode = 'select' | 'draw' | 'pan';

export type ToolState = {
  mode: CanvasMode;
  selectedBBoxId: string | null;
  selectedClassId: number;
  isDrawing: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
};

// Utility type for YOLO format conversion
export type YoloAnnotation = {
  classId: number;
  xCenter: number;  // normalized 0-1
  yCenter: number;  // normalized 0-1
  width: number;    // normalized 0-1
  height: number;   // normalized 0-1
};
