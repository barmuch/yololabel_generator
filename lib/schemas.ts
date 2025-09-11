// Database schemas for MongoDB collections
import { ObjectId } from 'mongodb';

export interface ProjectDocument {
  _id?: ObjectId;
  id: string; // Custom project ID
  name: string;
  description?: string;
  classes: {
    id: string;
    name: string;
    color: string;
  }[];
  createdAt: number;
  updatedAt: number;
  imageCount: number; // Cache for quick access
  annotationCount: number; // Cache for quick access
}

export interface ImageDocument {
  _id?: ObjectId;
  id: string; // Custom image ID
  projectId: string; // Reference to project
  name: string;
  originalName: string;
  
  // Cloudinary data
  cloudinary: {
    public_id: string;
    secure_url: string;
    url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    resource_type: string;
  };
  
  // Image metadata
  width: number;
  height: number;
  format: string;
  size: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // Status
  status: 'new' | 'labeled' | 'reviewed';
  annotationCount: number; // Cache for quick access
  
  // PDF-specific fields (optional)
  originalFormat?: string; // 'pdf' for PDF pages, undefined for regular images
  isPdfPage?: boolean; // true if this is a PDF page
  pdfPageNumber?: number; // page number within the PDF
  originalPdfName?: string; // original PDF filename
  pdfOrientation?: string; // orientation of this specific PDF page
  originalPdfWidth?: number; // original PDF page width
  originalPdfHeight?: number; // original PDF page height
}

export interface AnnotationDocument {
  _id?: ObjectId;
  id: string; // Custom annotation ID
  projectId: string; // Reference to project
  imageId: string; // Reference to image
  
  // Bounding box data
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Classification
  classId: string;
  className: string;
  confidence?: number;
  
  // YOLO format data (for export)
  yolo: {
    class_id: number;
    x_center: number;
    y_center: number;
    width: number;
    height: number;
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string; // User identifier for collaboration
}
