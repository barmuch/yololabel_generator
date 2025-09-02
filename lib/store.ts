import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ImageItem, BBox, ClassDef, Project, ToolState, ViewportState, ExportOptions } from './types';
import { generateRandomColor } from './utils';
import { saveProject as saveProjectToIDB, loadProject as loadProjectFromIDB } from './idb';

interface LabelStore {
  // Project state
  currentProject: Project | null;
  
  // UI state
  currentImageId: string | null;
  toolState: ToolState;
  viewport: ViewportState;
  exportOptions: ExportOptions;
  
  // Loading/saving state
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions - Project management
  createProject: (name: string) => void;
  loadProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  
  // Actions - Image management
  addImages: (files: File[]) => Promise<void>;
  removeImage: (imageId: string) => Promise<void>;
  setCurrentImage: (imageId: string | null) => void;
  
  // Actions - Class management
  addClass: (name: string) => void;
  removeClass: (classId: number) => void;
  updateClass: (classId: number, updates: Partial<ClassDef>) => void;
  reorderClasses: (newOrder: ClassDef[]) => void;
  
  // Actions - BBox management
  addBBox: (bbox: Omit<BBox, 'id'>) => string;
  updateBBox: (bboxId: string, updates: Partial<BBox>) => void;
  removeBBox: (bboxId: string) => void;
  getBBoxesForImage: (imageId: string) => BBox[];
  
  // Actions - Tool state
  setToolMode: (mode: ToolState['mode']) => void;
  setSelectedBBox: (bboxId: string | null) => void;
  setSelectedClass: (classId: number) => void;
  toggleDrawing: (isDrawing: boolean) => void;
  
  // Actions - Viewport
  setViewport: (viewport: Partial<ViewportState>) => void;
  resetViewport: () => void;
  
  // Actions - Export options
  setExportOptions: (options: Partial<ExportOptions>) => void;
  
  // Utility actions
  clearAll: () => void;
  saveToIndexedDB: () => Promise<void>;
  loadFromIndexedDB: (projectId: string) => Promise<void>;
}

const defaultToolState: ToolState = {
  mode: 'select',
  selectedBBoxId: null,
  selectedClassId: 0,
  isDrawing: false,
  showGrid: false,
  snapToGrid: false,
  gridSize: 20,
};

const defaultViewport: ViewportState = {
  scale: 1,
  x: 0,
  y: 0,
  width: 800,
  height: 600,
};

const defaultExportOptions: ExportOptions = {
  includeDataYaml: true,
  trainSplit: 70,
  valSplit: 20,
  testSplit: 10,
  splitMethod: 'random',
};

export const useLabelStore = create<LabelStore>()(
  immer((set, get) => ({
    // Initial state
    currentProject: null,
    currentImageId: null,
    toolState: defaultToolState,
    viewport: defaultViewport,
    exportOptions: defaultExportOptions,
    isLoading: false,
    isSaving: false,

    // Project management
    createProject: (name: string) => {
      const project: Project = {
        id: `project_${Date.now()}`,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        images: [],
        bboxes: [],
        classes: [
          { id: 0, name: 'object', color: generateRandomColor() }
        ],
      };
      
      console.log('Creating project:', project);
      
      set((state) => {
        state.currentProject = project;
        state.currentImageId = null;
        state.toolState = { ...defaultToolState };
      });
      
      // Auto-save the new project
      setTimeout(async () => {
        try {
          await get().saveToIndexedDB();
          console.log('New project auto-saved');
        } catch (error) {
          console.error('Failed to auto-save new project:', error);
        }
      }, 0);
    },

    loadProject: (project: Project) => {
      console.log('Loading project into store:', project.name, 'with', project.images.length, 'images');
      
      set((state) => {
        state.currentProject = project;
        state.currentImageId = project.images.length > 0 ? project.images[0].id : null;
      });
      
      console.log('Project loaded, currentImageId set to:', project.images.length > 0 ? project.images[0].id : null);
    },

    updateProjectName: (name: string) => {
      set((state) => {
        if (state.currentProject) {
          state.currentProject.name = name;
          state.currentProject.updatedAt = Date.now();
        }
      });
    },

    // Image management
    addImages: async (files: File[]) => {
      console.log('addImages called with files:', files.map(f => f.name));
      set((state) => { state.isLoading = true; });

      try {
        const newImages: ImageItem[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const file of files) {
          console.log('Processing file:', file.name, 'type:', file.type);
          
          // Validate file type
          if (!file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${file.name}`);
            continue;
          }

          try {
            console.log(`📤 Uploading ${file.name} to Cloudinary...`);
            
            // Create FormData for upload
            const formData = new FormData();
            formData.append('file', file);

            // Upload to Cloudinary via API route
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.statusText}`);
            }

            const uploadResult = await response.json();
            
            if (!uploadResult.success) {
              throw new Error(uploadResult.error || 'Upload failed');
            }

            console.log(`✅ Cloudinary upload success for ${file.name}:`, uploadResult);

            const imageItem: ImageItem = {
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              width: uploadResult.width,
              height: uploadResult.height,
              url: uploadResult.url, // Use Cloudinary URL as main URL
              cloudinary: {
                public_id: uploadResult.public_id,
                secure_url: uploadResult.url,
                width: uploadResult.width,
                height: uploadResult.height,
                format: uploadResult.format,
                bytes: uploadResult.bytes,
              },
              status: "new"
            };

            newImages.push(imageItem);
            successCount++;
            console.log('Created Cloudinary image item:', imageItem);

          } catch (error) {
            console.error(`❌ Failed to upload ${file.name} to Cloudinary:`, error);
            errorCount++;
            
            // Fallback to blob URL if Cloudinary fails
            try {
              console.log(`🔄 Falling back to blob URL for ${file.name}`);
              
              // Create object URL for the image
              const blobUrl = URL.createObjectURL(file);
              console.log('Created blob URL for', file.name, ':', blobUrl);

              // Get image dimensions
              const { width, height } = await getImageDimensions(blobUrl);
              console.log('Image dimensions for', file.name, ':', width, 'x', height);

              const imageItem: ImageItem = {
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                width,
                height,
                url: blobUrl, // Use blob URL as fallback
                blobUrl,
                status: 'new',
              };

              console.log('Created fallback image item:', imageItem);
              newImages.push(imageItem);
              
            } catch (fallbackError) {
              console.error(`❌ Fallback also failed for ${file.name}:`, fallbackError);
            }
          }
        }

        console.log(`📊 Upload summary: ${successCount} Cloudinary, ${newImages.length - successCount} fallback, ${errorCount} failed`);
        console.log('Adding', newImages.length, 'images to project');

        set((state) => {
          if (state.currentProject) {
            state.currentProject.images.push(...newImages);
            state.currentProject.updatedAt = Date.now();
            
            // Set first image as current if none selected
            if (!state.currentImageId && newImages.length > 0) {
              console.log('Setting first image as current:', newImages[0].id);
              state.currentImageId = newImages[0].id;
            }
          }
        });

        // Auto-save after adding images
        get().saveToIndexedDB();
      } catch (error) {
        console.error('Error adding images:', error);
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },

    removeImage: async (imageId: string) => {
      // First, get the image data and remove from state
      const getCurrentState = () => get().currentProject;
      const project = getCurrentState();
      
      if (!project) return;
      
      const imageIndex = project.images.findIndex(img => img.id === imageId);
      if (imageIndex === -1) return;
      
      const imageToRemove = project.images[imageIndex];
      
      // Update state
      set((state) => {
        if (state.currentProject) {
          // Clean up blob URL if exists
          if (imageToRemove.blobUrl) {
            URL.revokeObjectURL(imageToRemove.blobUrl);
          }
          
          // Remove image
          state.currentProject.images.splice(imageIndex, 1);

          // Remove associated bboxes
          state.currentProject.bboxes = state.currentProject.bboxes.filter(
            bbox => bbox.imageId !== imageId
          );

          // Update current image if it was removed
          if (state.currentImageId === imageId) {
            state.currentImageId = state.currentProject.images.length > 0 
              ? state.currentProject.images[0].id 
              : null;
          }

          state.currentProject.updatedAt = Date.now();
        }
      });

      // Delete from Cloudinary if it was uploaded there
      if (imageToRemove.cloudinary?.public_id) {
        try {
          console.log(`🗑️ Deleting ${imageToRemove.name} from Cloudinary...`);
          
          const response = await fetch(`/api/upload?public_id=${encodeURIComponent(imageToRemove.cloudinary.public_id)}`, {
            method: 'DELETE',
          });

          const result = await response.json();
          if (result.success) {
            console.log(`✅ Successfully deleted ${imageToRemove.name} from Cloudinary`);
          } else {
            console.warn(`⚠️ Failed to delete ${imageToRemove.name} from Cloudinary:`, result);
          }
        } catch (error) {
          console.error(`❌ Error deleting ${imageToRemove.name} from Cloudinary:`, error);
        }
      }

      // Auto-save after removing image
      get().saveToIndexedDB();
    },

    setCurrentImage: (imageId: string | null) => {
      set((state) => {
        state.currentImageId = imageId;
        state.toolState.selectedBBoxId = null; // Clear selection when switching images
      });
    },

    // Class management
    addClass: (name: string) => {
      set((state) => {
        if (state.currentProject) {
          const maxId = Math.max(...state.currentProject.classes.map(c => c.id), -1);
          const newClass: ClassDef = {
            id: maxId + 1,
            name,
            color: generateRandomColor(),
          };
          state.currentProject.classes.push(newClass);
          state.currentProject.updatedAt = Date.now();
        }
      });
    },

    removeClass: (classId: number) => {
      set((state) => {
        if (state.currentProject) {
          // Remove class
          state.currentProject.classes = state.currentProject.classes.filter(
            cls => cls.id !== classId
          );

          // Remove all bboxes with this class
          state.currentProject.bboxes = state.currentProject.bboxes.filter(
            bbox => bbox.classId !== classId
          );

          // Update selected class if it was removed
          if (state.toolState.selectedClassId === classId) {
            state.toolState.selectedClassId = state.currentProject.classes.length > 0 
              ? state.currentProject.classes[0].id 
              : 0;
          }

          state.currentProject.updatedAt = Date.now();
        }
      });
    },

    updateClass: (classId: number, updates: Partial<ClassDef>) => {
      set((state) => {
        if (state.currentProject) {
          const classIndex = state.currentProject.classes.findIndex(cls => cls.id === classId);
          if (classIndex >= 0) {
            Object.assign(state.currentProject.classes[classIndex], updates);
            state.currentProject.updatedAt = Date.now();
          }
        }
      });
    },

    reorderClasses: (newOrder: ClassDef[]) => {
      set((state) => {
        if (state.currentProject) {
          // Update class IDs based on new order
          const classIdMapping: Record<number, number> = {};
          
          newOrder.forEach((cls, index) => {
            classIdMapping[cls.id] = index;
          });

          // Update class definitions
          state.currentProject.classes = newOrder.map((cls, index) => ({
            ...cls,
            id: index,
          }));

          // Update all bbox class IDs
          state.currentProject.bboxes.forEach(bbox => {
            if (classIdMapping[bbox.classId] !== undefined) {
              bbox.classId = classIdMapping[bbox.classId];
            }
          });

          // Update selected class ID
          if (classIdMapping[state.toolState.selectedClassId] !== undefined) {
            state.toolState.selectedClassId = classIdMapping[state.toolState.selectedClassId];
          }

          state.currentProject.updatedAt = Date.now();
        }
      });
    },

    // BBox management
    addBBox: (bbox: Omit<BBox, 'id'>) => {
      const id = `bbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      set((state) => {
        if (state.currentProject) {
          state.currentProject.bboxes.push({ ...bbox, id });
          state.currentProject.updatedAt = Date.now();
          
          // Update image status
          const image = state.currentProject.images.find(img => img.id === bbox.imageId);
          if (image) {
            image.status = 'labeled';
          }
        }
      });

      return id;
    },

    updateBBox: (bboxId: string, updates: Partial<BBox>) => {
      set((state) => {
        if (state.currentProject) {
          const bboxIndex = state.currentProject.bboxes.findIndex(bbox => bbox.id === bboxId);
          if (bboxIndex >= 0) {
            Object.assign(state.currentProject.bboxes[bboxIndex], updates);
            state.currentProject.updatedAt = Date.now();
          }
        }
      });
    },

    removeBBox: (bboxId: string) => {
      set((state) => {
        if (state.currentProject) {
          const bboxIndex = state.currentProject.bboxes.findIndex(bbox => bbox.id === bboxId);
          if (bboxIndex >= 0) {
            const bbox = state.currentProject.bboxes[bboxIndex];
            state.currentProject.bboxes.splice(bboxIndex, 1);
            
            // Update image status if no more bboxes
            const remainingBboxes = state.currentProject.bboxes.filter(b => b.imageId === bbox.imageId);
            if (remainingBboxes.length === 0) {
              const image = state.currentProject.images.find(img => img.id === bbox.imageId);
              if (image) {
                image.status = 'new';
              }
            }

            // Clear selection if removed bbox was selected
            if (state.toolState.selectedBBoxId === bboxId) {
              state.toolState.selectedBBoxId = null;
            }

            state.currentProject.updatedAt = Date.now();
          }
        }
      });
    },

    getBBoxesForImage: (imageId: string) => {
      const project = get().currentProject;
      return project ? project.bboxes.filter(bbox => bbox.imageId === imageId) : [];
    },

    // Tool state
    setToolMode: (mode: ToolState['mode']) => {
      set((state) => {
        state.toolState.mode = mode;
        state.toolState.isDrawing = false;
      });
    },

    setSelectedBBox: (bboxId: string | null) => {
      set((state) => {
        state.toolState.selectedBBoxId = bboxId;
      });
    },

    setSelectedClass: (classId: number) => {
      set((state) => {
        state.toolState.selectedClassId = classId;
      });
    },

    toggleDrawing: (isDrawing: boolean) => {
      set((state) => {
        state.toolState.isDrawing = isDrawing;
      });
    },

    // Viewport
    setViewport: (viewport: Partial<ViewportState>) => {
      set((state) => {
        Object.assign(state.viewport, viewport);
      });
    },

    resetViewport: () => {
      set((state) => {
        state.viewport = { ...defaultViewport };
      });
    },

    // Export options
    setExportOptions: (options: Partial<ExportOptions>) => {
      set((state) => {
        Object.assign(state.exportOptions, options);
      });
    },

    // Utility
    clearAll: () => {
      set((state) => {
        if (state.currentProject) {
          // Clean up object URLs
          state.currentProject.images.forEach(image => {
            if (image.blobUrl) {
              URL.revokeObjectURL(image.blobUrl);
            }
          });
        }
        
        state.currentProject = null;
        state.currentImageId = null;
        state.toolState = { ...defaultToolState };
        state.viewport = { ...defaultViewport };
      });
    },

    saveToIndexedDB: async () => {
      const project = get().currentProject;
      if (!project) return;

      set((state) => { state.isSaving = true; });

      try {
        await saveProjectToIDB(project);
        console.log('Project saved to IndexedDB:', project.name);

        // Also persist to server (MongoDB)
        try {
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
          });

          if (!res.ok) {
            console.warn('Failed to save project to server:', await res.text());
          } else {
            console.log('Project saved to server (MongoDB)');
          }
        } catch (serverErr) {
          console.warn('Error saving project to server:', serverErr);
        }
      } catch (error) {
        console.error('Error saving to IndexedDB:', error);
      } finally {
        set((state) => { state.isSaving = false; });
      }
    },

    loadFromIndexedDB: async (projectId: string) => {
      set((state) => { state.isLoading = true; });

      try {
        const project = await loadProjectFromIDB(projectId);
        if (project) {
          get().loadProject(project);
          console.log('Project loaded from IndexedDB:', project.name);
        }
      } catch (error) {
        console.error('Error loading from IndexedDB:', error);
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },
  }))
);

// Helper function to get image dimensions
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    console.log('Getting dimensions for:', src);
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded, dimensions:', img.naturalWidth, 'x', img.naturalHeight);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e) => {
      console.error('Failed to load image for dimensions:', e);
      reject(e);
    };
    img.src = src;
  });
}
