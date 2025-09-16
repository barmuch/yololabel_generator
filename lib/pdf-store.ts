import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PdfPageInfo } from './cloudinary-pdf';
import { BBox } from './types';

export interface PdfDocument {
  publicId: string;
  filename: string;
  pageCount: number;
  size: number;
  uploadedAt: Date;
  pages: PdfPageInfo[];
}

export interface PdfState {
  // Current PDF document
  currentPdf: PdfDocument | null;
  
  // Current page being viewed/annotated
  currentPageNumber: number;
  
  // Annotations for each page (keyed by pageNumber)
  pageAnnotations: Record<number, BBox[]>;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  
  // Actions
  setPdf: (pdf: PdfDocument) => void;
  clearPdf: () => void;
  setCurrentPage: (pageNumber: number) => void;
  setPageAnnotations: (pageNumber: number, annotations: BBox[]) => void;
  addAnnotation: (pageNumber: number, annotation: BBox) => void;
  updateAnnotation: (pageNumber: number, annotationId: string, updates: Partial<BBox>) => void;
  deleteAnnotation: (pageNumber: number, annotationId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Get annotations for current page
  getCurrentPageAnnotations: () => BBox[];
  
  // Get total annotation count across all pages
  getTotalAnnotationCount: () => number;
  
  // Export functions
  exportCurrentPageAnnotations: () => string;
  exportAllPagesAnnotations: () => Record<number, string>;
}

export const usePdfStore = create<PdfState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPdf: null,
      currentPageNumber: 1,
      pageAnnotations: {},
      isLoading: false,
      error: null,
      sidebarOpen: true,
      
      // Actions
      setPdf: (pdf: PdfDocument) => {
        set({
          currentPdf: pdf,
          currentPageNumber: 1,
          pageAnnotations: {},
          error: null
        });
      },
      
      clearPdf: () => {
        set({
          currentPdf: null,
          currentPageNumber: 1,
          pageAnnotations: {},
          error: null
        });
      },
      
      setCurrentPage: (pageNumber: number) => {
        const { currentPdf } = get();
        if (currentPdf && pageNumber >= 1 && pageNumber <= currentPdf.pageCount) {
          set({ currentPageNumber: pageNumber });
        }
      },
      
      setPageAnnotations: (pageNumber: number, annotations: BBox[]) => {
        set((state) => ({
          pageAnnotations: {
            ...state.pageAnnotations,
            [pageNumber]: annotations
          }
        }));
      },
      
      addAnnotation: (pageNumber: number, annotation: BBox) => {
        set((state) => {
          const currentAnnotations = state.pageAnnotations[pageNumber] || [];
          return {
            pageAnnotations: {
              ...state.pageAnnotations,
              [pageNumber]: [...currentAnnotations, annotation]
            }
          };
        });
      },
      
      updateAnnotation: (pageNumber: number, annotationId: string, updates: Partial<BBox>) => {
        set((state) => {
          const currentAnnotations = state.pageAnnotations[pageNumber] || [];
          const updatedAnnotations = currentAnnotations.map(ann => 
            ann.id === annotationId ? { ...ann, ...updates } : ann
          );
          return {
            pageAnnotations: {
              ...state.pageAnnotations,
              [pageNumber]: updatedAnnotations
            }
          };
        });
      },
      
      deleteAnnotation: (pageNumber: number, annotationId: string) => {
        set((state) => {
          const currentAnnotations = state.pageAnnotations[pageNumber] || [];
          const filteredAnnotations = currentAnnotations.filter(ann => ann.id !== annotationId);
          return {
            pageAnnotations: {
              ...state.pageAnnotations,
              [pageNumber]: filteredAnnotations
            }
          };
        });
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
      
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
      
      // Computed functions
      getCurrentPageAnnotations: () => {
        const { pageAnnotations, currentPageNumber } = get();
        return pageAnnotations[currentPageNumber] || [];
      },
      
      getTotalAnnotationCount: () => {
        const { pageAnnotations } = get();
        return Object.values(pageAnnotations).reduce(
          (total, annotations) => total + annotations.length, 
          0
        );
      },
      
      // Export functions
      exportCurrentPageAnnotations: () => {
        const { getCurrentPageAnnotations } = get();
        const annotations = getCurrentPageAnnotations();
        
        return annotations.map(ann => {
          const { x, y, w, h } = ann;
          // Convert to YOLO format (normalized coordinates)
          const centerX = (x + w / 2);
          const centerY = (y + h / 2);
          return `${ann.classId} ${centerX} ${centerY} ${w} ${h}`;
        }).join('\n');
      },
      
      exportAllPagesAnnotations: () => {
        const { pageAnnotations } = get();
        const result: Record<number, string> = {};
        
        Object.entries(pageAnnotations).forEach(([pageNum, annotations]) => {
          const pageNumber = parseInt(pageNum);
          result[pageNumber] = annotations.map(ann => {
            const { x, y, w, h } = ann;
            // Convert to YOLO format (normalized coordinates)
            const centerX = (x + w / 2);
            const centerY = (y + h / 2);
            return `${ann.classId} ${centerX} ${centerY} ${w} ${h}`;
          }).join('\n');
        });
        
        return result;
      }
    }),
    {
      name: 'pdf-store', // Key for localStorage
      partialize: (state) => ({
        // Only persist these fields
        currentPdf: state.currentPdf,
        currentPageNumber: state.currentPageNumber,
        pageAnnotations: state.pageAnnotations,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
);
