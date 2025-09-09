import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ImageItem, BBox, ClassDef, Project, ToolState, ViewportState, ExportOptions } from './types';
import { generateRandomColor } from './utils';
import { saveProject as saveProjectToIDB, loadProject as loadProjectFromIDB } from './idb';

// Track which projects we've fetched server images for to avoid repeated requests
const fetchedProjectImages = new Set<string>();

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
  hasUnsavedChanges: boolean;
  
  // Actions - Project management
  createProject: (name: string) => void;
  loadProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  
  // Actions - Image management
  addImages: (files: File[]) => Promise<void>;
  addImagesFromData: (images: ImageItem[]) => void;
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
  // Fetch and merge server-stored images (Cloudinary metadata persisted in MongoDB)
  fetchAndMergeServerImages: (projectId?: string) => Promise<void>;
  // Save annotations for specific image to server
  saveAnnotationsToServer: (imageId: string) => Promise<void>;
  // Individual annotation management
  saveAnnotationToServer: (bboxId: string) => Promise<void>;
  updateAnnotationOnServer: (bboxId: string) => Promise<void>;
  deleteAnnotationFromServer: (bboxId: string, imageId: string, projectId: string) => Promise<void>;
  // Load annotations for project from server
  loadAnnotationsFromServer: (projectId: string) => Promise<void>;
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
    hasUnsavedChanges: false,

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
      
      // Normalize images to ensure each has a usable `url` so thumbnails render.
      try {
        project.images = (project.images || []).map((img) => {
          // If url is missing but cloudinary secure url exists, use it.
          if (!img.url) {
            img.url = img.cloudinary?.secure_url ?? img.blobUrl ?? '';
            if (img.url) {
              console.log('Normalized image.url for', img.name, '->', img.url);
            }
          }
          return img;
        });
      } catch (e) {
        console.warn('Error normalizing project images on load:', e);
      }

      set((state) => {
        state.currentProject = project;
        state.currentImageId = project.images.length > 0 ? project.images[0].id : null;
      });
      
      console.log('Project loaded, currentImageId set to:', project.images.length > 0 ? project.images[0].id : null);
      
      // Fetch images from MongoDB after loading project
      console.log('Fetching images from MongoDB for project:', project.id);
      
      // Clear any previous fetch tracking for this project to ensure fresh fetch
      fetchedProjectImages.delete(project.id);
      
      // Fetch images and annotations from server
      const fetchOperations = async () => {
        await get().fetchAndMergeServerImages(project.id);
        await get().loadAnnotationsFromServer(project.id);
      };
      
      fetchOperations().catch(error => {
        console.error('Error fetching project data from server:', error);
      });
    },

    updateProjectName: (name: string) => {
      set((state) => {
        if (state.currentProject) {
          state.currentProject.name = name;
          state.currentProject.updatedAt = Date.now();
          state.hasUnsavedChanges = true;
        }
      });
    },

    // Image management
    addImages: async (files: File[]) => {
      console.log('addImages called with files:', files.map(f => f.name));
      const currentProject = get().currentProject;
      
      if (!currentProject) {
        console.error('No project loaded');
        alert('Please load a project first');
        return;
      }
      
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
            console.log(`📤 Uploading ${file.name} via complete upload flow...`);
            
            // Create FormData for upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', currentProject.id);

            // Upload via complete upload flow (Cloudinary + MongoDB)
            const response = await fetch('/api/upload-complete', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
              throw new Error(result.error || 'Upload failed');
            }

            console.log(`✅ Complete upload success for ${file.name}:`, result);

            const imageItem: ImageItem = {
              id: result.imageMetadata.id,
              name: file.name,
              width: result.width,
              height: result.height,
              url: result.url,
              cloudinary: {
                public_id: result.public_id,
                secure_url: result.url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
              },
              status: "new"
            };

            newImages.push(imageItem);
            successCount++;
            console.log('Created image item:', imageItem);

          } catch (error) {
            console.error(`❌ Failed to upload ${file.name}:`, error);
            errorCount++;
          }
        }

        console.log(`📊 Upload summary: ${successCount} successful, ${errorCount} failed`);
        console.log('Adding', newImages.length, 'images to project');

        if (newImages.length > 0) {
          set((state) => {
            if (state.currentProject) {
              state.currentProject.images.push(...newImages);
              state.currentProject.updatedAt = Date.now();
              state.hasUnsavedChanges = true;
              
              // Set first image as current if none selected
              if (!state.currentImageId && newImages.length > 0) {
                console.log('Setting first image as current:', newImages[0].id);
                state.currentImageId = newImages[0].id;
              }
            }
          });
        }

        if (errorCount > 0) {
          alert(`Upload completed with ${errorCount} errors. Check console for details.`);
        }
      } catch (error) {
        console.error('Error adding images:', error);
        alert('Failed to upload images: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },

    // Add images from pre-processed data (e.g., converted PDF pages)
    addImagesFromData: (images: ImageItem[]) => {
      console.log('addImagesFromData called with images:', images.map(img => img.name));
      const currentProject = get().currentProject;
      
      if (!currentProject) {
        console.error('No project loaded');
        alert('Please load a project first');
        return;
      }

      if (images.length === 0) {
        console.warn('No images provided');
        return;
      }

      set((state) => {
        if (state.currentProject) {
          // Add new images to the project
          state.currentProject.images.push(...images);
          state.currentProject.updatedAt = Date.now();
          state.hasUnsavedChanges = true;
          
          console.log(`Added ${images.length} images to project. Total: ${state.currentProject.images.length}`);
          
          // Set first added image as current if no image is currently selected
          if (!state.currentImageId && images.length > 0) {
            state.currentImageId = images[0].id;
            console.log('Set current image to:', images[0].name);
          }
        }
      });

      // Auto-save to IndexedDB
      const saveToIndexedDB = get().saveToIndexedDB;
      saveToIndexedDB();
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
          state.hasUnsavedChanges = true;
        }
      });

      // Delete from MongoDB and Cloudinary
      if (imageToRemove.cloudinary?.public_id) {
        try {
          console.log(`🗑️ Deleting ${imageToRemove.name} from MongoDB and Cloudinary...`);
          
          // Delete from MongoDB (which will also delete from Cloudinary if requested)
          const response = await fetch(`/api/images?imageId=${encodeURIComponent(imageId)}&projectId=${encodeURIComponent(project.id)}&deleteFromCloudinary=true`, {
            method: 'DELETE',
          });

          const result = await response.json();
          if (result.success) {
            console.log(`✅ Successfully deleted ${imageToRemove.name} from database and Cloudinary`);
            console.log(`🗑️ Also deleted ${result.deletedAnnotations} associated annotations`);
          } else {
            console.warn(`⚠️ Failed to delete ${imageToRemove.name} from database:`, result);
          }
        } catch (error) {
          console.error(`❌ Error deleting ${imageToRemove.name}:`, error);
        }
      } else {
        // If no Cloudinary data, just delete from MongoDB
        try {
          console.log(`🗑️ Deleting ${imageToRemove.name} from MongoDB only...`);
          
          const response = await fetch(`/api/images?imageId=${encodeURIComponent(imageId)}&projectId=${encodeURIComponent(project.id)}`, {
            method: 'DELETE',
          });

          const result = await response.json();
          if (result.success) {
            console.log(`✅ Successfully deleted ${imageToRemove.name} from database`);
            console.log(`🗑️ Also deleted ${result.deletedAnnotations} associated annotations`);
          } else {
            console.warn(`⚠️ Failed to delete ${imageToRemove.name} from database:`, result);
          }
        } catch (error) {
          console.error(`❌ Error deleting ${imageToRemove.name}:`, error);
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
          state.hasUnsavedChanges = true;
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
          state.hasUnsavedChanges = true;
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
            state.hasUnsavedChanges = true;
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
          state.hasUnsavedChanges = true;
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
          state.hasUnsavedChanges = true;
          
          // Update image status
          const image = state.currentProject.images.find(img => img.id === bbox.imageId);
          if (image) {
            image.status = 'labeled';
          }
        }
      });

      // Auto-save individual annotation to server
      get().saveAnnotationToServer(id);

      return id;
    },

    updateBBox: (bboxId: string, updates: Partial<BBox>) => {
      let affectedImageId: string | undefined;
      
      set((state) => {
        if (state.currentProject) {
          const bboxIndex = state.currentProject.bboxes.findIndex(bbox => bbox.id === bboxId);
          if (bboxIndex >= 0) {
            affectedImageId = state.currentProject.bboxes[bboxIndex].imageId;
            Object.assign(state.currentProject.bboxes[bboxIndex], updates);
            state.currentProject.updatedAt = Date.now();
            state.hasUnsavedChanges = true;
          }
        }
      });

      // Auto-save individual annotation update to server
      if (affectedImageId) {
        get().updateAnnotationOnServer(bboxId);
      }
    },

    removeBBox: (bboxId: string) => {
      console.log('🗑️ removeBBox called with bboxId:', bboxId);
      
      let affectedImageId: string | undefined;
      let affectedProjectId: string | undefined;
      
      set((state) => {
        if (state.currentProject) {
          const bboxIndex = state.currentProject.bboxes.findIndex(bbox => bbox.id === bboxId);
          console.log('📍 Found bbox at index:', bboxIndex);
          
          if (bboxIndex >= 0) {
            const bbox = state.currentProject.bboxes[bboxIndex];
            affectedImageId = bbox.imageId;
            affectedProjectId = state.currentProject.id;
            
            console.log('🎯 Removing bbox:', { id: bbox.id, imageId: affectedImageId, projectId: affectedProjectId });
            
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
            state.hasUnsavedChanges = true;
          }
        }
      });

      // Auto-delete annotation from server
      if (affectedImageId && affectedProjectId) {
        console.log('🌐 Calling deleteAnnotationFromServer:', { bboxId, affectedImageId, affectedProjectId });
        get().deleteAnnotationFromServer(bboxId, affectedImageId, affectedProjectId);
      } else {
        console.warn('⚠️ Cannot delete from server: missing imageId or projectId');
      }
    },

    getBBoxesForImage: (imageId: string) => {
      const project = get().currentProject;
      if (!project || !project.bboxes || !Array.isArray(project.bboxes)) {
        return [];
      }
      return project.bboxes.filter(bbox => bbox?.imageId === imageId);
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
      // clear fetched tracking so future projects can re-fetch images
      try {
        fetchedProjectImages.clear();
      } catch (e) {
        /* noop */
      }
    },

    saveToIndexedDB: async () => {
      const project = get().currentProject;
      const hasChanges = get().hasUnsavedChanges;
      
      if (!project || !hasChanges) {
        console.log('⏭️ Skipping save - no changes detected');
        return;
      }

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
            // Mark as saved only if both IndexedDB and MongoDB save succeeded
            set((state) => { state.hasUnsavedChanges = false; });
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

    fetchAndMergeServerImages: async (projectId?: string) => {
      let pid: string | undefined;
      try {
        pid = projectId || get().currentProject?.id;
        if (!pid) return;

        // Avoid repeated fetches for same project. Mark as fetching immediately
        // so concurrent calls won't each start network requests.
        if (fetchedProjectImages.has(pid)) {
          // already fetched (or currently fetching)
          console.log('[fetchAndMergeServerImages] Already fetched/fetching project:', pid);
          return;
        }

        // mark as fetching right away
        fetchedProjectImages.add(pid);

        console.log('[fetchAndMergeServerImages] Fetching server-stored images for project:', pid);

        const res = await fetch(`/api/images?projectId=${encodeURIComponent(pid)}`);
        if (!res.ok) {
          // allow future retries
          fetchedProjectImages.delete(pid);
          console.warn('[fetchAndMergeServerImages] Failed to fetch server images:', await res.text());
          return;
        }

        const data = await res.json();
        if (!data.success || !Array.isArray(data.images)) {
          // allow future retries
          fetchedProjectImages.delete(pid);
          console.warn('[fetchAndMergeServerImages] No images returned from server:', data);
          return;
        }

        const serverImages = data.images as any[];
        console.log(`[fetchAndMergeServerImages] Server returned ${serverImages.length} images for project ${pid}:`);
        
        if (serverImages.length > 0) {
          console.log('[fetchAndMergeServerImages] First image sample:', {
            publicId: serverImages[0].publicId,
            url: serverImages[0].url,
            originalName: serverImages[0].originalName,
            width: serverImages[0].width,
            height: serverImages[0].height
          });
        }

        set((state) => {
          if (!state.currentProject) {
            console.warn('[fetchAndMergeServerImages] No current project in state!');
            return;
          }

          console.log(`[fetchAndMergeServerImages] Current project has ${state.currentProject.images.length} images before merge`);

          // For each server image, if not already in project, add it
          let addedCount = 0;
          for (const si of serverImages) {
            console.log(`[fetchAndMergeServerImages] Processing server image:`, {
              publicId: si.publicId,
              url: si.url,
              originalName: si.originalName,
              width: si.width,
              height: si.height,
              annotations: si.annotations ? si.annotations.length : 0
            });

            // Avoid duplicates by publicId or url
            const existingImageIndex = state.currentProject.images.findIndex(img => 
              img.cloudinary?.public_id === si.publicId || img.url === si.url
            );
            
            if (existingImageIndex >= 0) {
              console.log(`[fetchAndMergeServerImages] Image already exists:`, si.publicId);
              continue;
            }

            const imageItem: any = {
              id: si.id || si._id || si.publicId, // Use the stable ID from MongoDB
              name: si.originalName || si.publicId,
              width: si.width || 0,
              height: si.height || 0,
              url: si.url,
              cloudinary: {
                public_id: si.publicId,
                secure_url: si.url,
                width: si.width || 0,
                height: si.height || 0,
                format: si.format || '',
                bytes: si.bytes || 0,
              },
              status: 'new', // Status will be updated when annotations are loaded
            };

            console.log(`[fetchAndMergeServerImages] Adding new image to project:`, imageItem);
            state.currentProject.images.push(imageItem);
            addedCount++;
          }

          console.log(`[fetchAndMergeServerImages] Added ${addedCount} new images. Project now has ${state.currentProject.images.length} total images`);
          state.currentProject.updatedAt = Date.now();
        });

        console.log('[fetchAndMergeServerImages] Merged', serverImages.length, 'server images into project');
      } catch (error) {
        // If an error happened, allow future retries by clearing the flag
        if (pid) {
          try { fetchedProjectImages.delete(pid); } catch (e) { /* noop */ }
        }
        console.error('[fetchAndMergeServerImages] Error fetching/merging server images:', error);
      }
    },

    saveAnnotationsToServer: async (imageId: string) => {
      try {
        const state = get();
        if (!state.currentProject) {
          console.warn('No current project to save annotations for');
          return;
        }

        // Find the image
        const image = state.currentProject.images.find(img => img.id === imageId);
        if (!image || !image.cloudinary?.public_id) {
          console.warn('Image not found or missing cloudinary public_id:', imageId);
          return;
        }

        // Get all annotations for this image
        const annotations = state.currentProject.bboxes
          .filter(bbox => bbox.imageId === imageId);

        console.log(`Saving ${annotations.length} annotations for image ${imageId} to server`);

        // First, check if image metadata exists in server
        const checkResponse = await fetch(`/api/images?projectId=${encodeURIComponent(state.currentProject.id)}`);
        let imageExists = false;
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.success && checkData.images) {
            imageExists = checkData.images.some((img: any) => 
              img.publicId === image.cloudinary?.public_id || img.public_id === image.cloudinary?.public_id
            );
          }
        }

        if (!imageExists) {
          // Save image metadata first
          console.log('Image metadata not found on server, saving image metadata first...');
          const imageMetadata = {
            projectId: state.currentProject.id,
            public_id: image.cloudinary.public_id,
            secure_url: image.cloudinary.secure_url,
            width: image.width,
            height: image.height,
            format: image.cloudinary.format,
            bytes: image.cloudinary.bytes,
            originalName: image.name,
          };

          const saveImageResponse = await fetch('/api/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageMetadata),
          });

          if (!saveImageResponse.ok) {
            console.warn('Failed to save image metadata to server:', await saveImageResponse.text());
            return;
          }
        }

        // Now save each annotation individually using the annotations API
        for (const bbox of annotations) {
          const annotationData = {
            id: bbox.id,
            projectId: state.currentProject.id,
            imageId: imageId,
            bbox: {
              x: bbox.x,
              y: bbox.y,
              width: bbox.w,
              height: bbox.h,
            },
            classId: bbox.classId,
            className: state.currentProject.classes.find(c => c.id === bbox.classId)?.name || '',
            confidence: 1.0,
            yolo: {
              x: (bbox.x + bbox.w / 2) / image.width,
              y: (bbox.y + bbox.h / 2) / image.height,
              width: bbox.w / image.width,
              height: bbox.h / image.height,
            },
            createdAt: Date.now(),
            createdBy: 'user'
          };

          const saveResponse = await fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(annotationData),
          });

          if (!saveResponse.ok) {
            console.warn(`Failed to save annotation ${bbox.id}:`, await saveResponse.text());
          } else {
            console.log(`✅ Annotation ${bbox.id} saved successfully`);
          }
        }

        console.log('All annotations processed');
      } catch (error) {
        console.error('Error saving annotations to server:', error);
      }
    },

    saveAnnotationToServer: async (bboxId: string) => {
      try {
        const state = get();
        if (!state.currentProject) {
          console.warn('No current project to save annotation for');
          return;
        }

        // Find the bbox
        const bbox = state.currentProject.bboxes.find(b => b.id === bboxId);
        if (!bbox) {
          console.warn('Bbox not found:', bboxId);
          return;
        }

        // Find the image
        const image = state.currentProject.images.find(img => img.id === bbox.imageId);
        if (!image || !image.cloudinary?.public_id) {
          console.warn('Image not found or missing cloudinary public_id:', bbox.imageId);
          return;
        }

        const annotationData = {
          id: bbox.id,
          projectId: state.currentProject.id,
          imageId: bbox.imageId,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            width: bbox.w,
            height: bbox.h,
          },
          classId: bbox.classId,
          className: state.currentProject.classes.find(c => c.id === bbox.classId)?.name || '',
          confidence: 1.0,
          yolo: {
            x: (bbox.x + bbox.w / 2) / image.width,
            y: (bbox.y + bbox.h / 2) / image.height,
            width: bbox.w / image.width,
            height: bbox.h / image.height,
          },
          createdAt: Date.now(),
          createdBy: 'user'
        };

        const response = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(annotationData),
        });

        if (response.ok) {
          console.log(`✅ Annotation ${bbox.id} saved successfully`);
        } else {
          console.warn(`Failed to save annotation ${bbox.id}:`, await response.text());
        }
      } catch (error) {
        console.error('Error saving annotation to server:', error);
      }
    },

    updateAnnotationOnServer: async (bboxId: string) => {
      try {
        const state = get();
        if (!state.currentProject) {
          console.warn('No current project to update annotation for');
          return;
        }

        // Find the bbox
        const bbox = state.currentProject.bboxes.find(b => b.id === bboxId);
        if (!bbox) {
          console.warn('Bbox not found:', bboxId);
          return;
        }

        // Find the image
        const image = state.currentProject.images.find(img => img.id === bbox.imageId);
        if (!image || !image.cloudinary?.public_id) {
          console.warn('Image not found or missing cloudinary public_id:', bbox.imageId);
          return;
        }

        const updateData = {
          id: bbox.id,
          projectId: state.currentProject.id,
          imageId: bbox.imageId,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            width: bbox.w,
            height: bbox.h,
          },
          classId: bbox.classId,
          className: state.currentProject.classes.find(c => c.id === bbox.classId)?.name || '',
          confidence: 1.0,
          yolo: {
            x: (bbox.x + bbox.w / 2) / image.width,
            y: (bbox.y + bbox.h / 2) / image.height,
            width: bbox.w / image.width,
            height: bbox.h / image.height,
          },
          updatedAt: Date.now()
        };

        const response = await fetch('/api/annotations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          console.log(`✅ Annotation ${bbox.id} updated successfully`);
        } else {
          console.warn(`Failed to update annotation ${bbox.id}:`, await response.text());
        }
      } catch (error) {
        console.error('Error updating annotation on server:', error);
      }
    },

    deleteAnnotationFromServer: async (bboxId: string, imageId: string, projectId: string) => {
      try {
        console.log('🌐 deleteAnnotationFromServer called:', { bboxId, imageId, projectId });
        
        const url = `/api/annotations?id=${encodeURIComponent(bboxId)}&imageId=${encodeURIComponent(imageId)}&projectId=${encodeURIComponent(projectId)}`;
        console.log('🔗 DELETE URL:', url);
        
        const response = await fetch(url, {
          method: 'DELETE',
        });

        console.log('📡 DELETE response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Annotation ${bboxId} deleted successfully:`, result);
        } else {
          const errorText = await response.text();
          console.warn(`❌ Failed to delete annotation ${bboxId}:`, errorText);
        }
      } catch (error) {
        console.error('Error deleting annotation from server:', error);
      }
    },

    loadAnnotationsFromServer: async (projectId: string) => {
      try {
        console.log('🔍 Loading annotations from server for project:', projectId);
        
        const response = await fetch(`/api/annotations?projectId=${encodeURIComponent(projectId)}`);
        
        if (!response.ok) {
          console.warn('Failed to load annotations from server:', await response.text());
          return;
        }
        
        const data = await response.json();
        if (!data.success || !data.annotations) {
          console.warn('No annotations data received from server');
          return;
        }
        
        const serverAnnotations = data.annotations;
        console.log(`📊 Found ${serverAnnotations.length} annotations on server for project ${projectId}`);
        
        // Debug: Log current images and their IDs
        const currentImages = get().currentProject?.images || [];
        console.log('🖼️ Current images in project:', currentImages.map(img => ({ id: img.id, name: img.name })));
        
        set((state) => {
          if (!state.currentProject || state.currentProject.id !== projectId) {
            console.warn('Current project mismatch when loading annotations');
            return;
          }
          
          // Clear existing bboxes for this project to avoid duplicates
          state.currentProject.bboxes = [];
          
          console.log('🔄 Processing annotations...');
          
          // Convert server annotations to bboxes
          for (const annotation of serverAnnotations) {
            console.log('📋 Processing annotation:', {
              id: annotation.id,
              imageId: annotation.imageId,
              bbox: annotation.bbox
            });
            
            // Find the image for this annotation
            const image = state.currentProject.images.find(img => img.id === annotation.imageId);
            if (!image) {
              console.warn('❌ Image not found for annotation:', {
                annotationImageId: annotation.imageId,
                availableImageIds: state.currentProject.images.map(img => img.id)
              });
              continue;
            }
            
            console.log('✅ Found matching image:', { imageId: image.id, imageName: image.name });
            
            // Convert annotation to bbox format
            const bbox: BBox = {
              id: annotation.id,
              imageId: annotation.imageId,
              classId: annotation.classId,
              x: annotation.bbox.x,
              y: annotation.bbox.y,
              w: annotation.bbox.width,
              h: annotation.bbox.height,
            };
            
            state.currentProject.bboxes.push(bbox);
            console.log('📦 Added bbox to project:', bbox);
            
            // Update image status
            image.status = 'labeled';
          }
          
          console.log(`✅ Loaded ${state.currentProject.bboxes.length} annotations into project`);
          
          // Debug: Log all loaded bboxes
          state.currentProject.bboxes.forEach(bbox => {
            console.log(`📦 Loaded bbox: ${bbox.id} for image ${bbox.imageId} at (${bbox.x},${bbox.y},${bbox.w},${bbox.h})`);
          });
        });
        
      } catch (error) {
        console.error('Error loading annotations from server:', error);
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
