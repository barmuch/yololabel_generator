'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useLabelStore } from '@/lib/store';
import { ClassPanel } from '@/components/ClassPanel';
import { ImageStrip } from '@/components/ImageStrip';
import { Toolbar } from '@/components/Toolbar';
import { ExportDialog } from '@/components/ExportDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Download, Upload, FolderOpen } from 'lucide-react';
import Link from 'next/link';

// Dynamically import CanvasStage to avoid SSR issues with Konva
const CanvasStage = dynamic(
  () => import('@/components/CanvasStage').then(mod => ({ default: mod.CanvasStage })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading canvas...</div>
      </div>
    )
  }
);

export default function LabelerPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as ('admin'|'member'|undefined);
  const {
    currentProject,
    currentImageId,
    setCurrentImage,
    updateProjectName,
    saveToIndexedDB,
    addImages,
    addImagesFromData,
    isSaving,
    isLoading,
    loadProject,
  } = useLabelStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchedProjectsRef = useRef<Set<string>>(new Set()); // Track which projects we've fetched images for

  const currentImage = currentProject?.images.find(img => img.id === currentImageId);

  // Debug logging and auto-load project
  useEffect(() => {
    console.log('=== LABELER PAGE DEBUG ===');
    console.log('Current project:', currentProject?.name);
    console.log('Current project images count:', currentProject?.images?.length || 0);
    console.log('Current image ID:', currentImageId);
    console.log('Current image found:', currentImage ? `${currentImage.name} (${currentImage.width}x${currentImage.height})` : 'null');
    console.log('Store state:', { currentProject: !!currentProject, currentImageId, isLoading });
    if (currentImage) {
      console.log('Current image URL:', currentImage.url);
    }
    
    // If no project is loaded, try to load the most recent one from server
    if (!currentProject && !isLoading) {
      console.log('No project loaded, checking for recent projects from server...');
      
      // Try to get the most recent project from MongoDB
      const loadRecentProject = async () => {
        try {
          console.log('Fetching recent projects from server...');
          const response = await fetch('/api/projects');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.projects && data.projects.length > 0) {
              const mostRecentProject = data.projects[0]; // Projects are sorted by updatedAt desc
              console.log('Found recent project, loading:', mostRecentProject.name);
              
              // Normalize project structure
              const normalizedProject = {
                ...mostRecentProject,
                images: mostRecentProject.images || [],
                bboxes: mostRecentProject.bboxes || [],
                classes: mostRecentProject.classes || []
              };
              
              loadProject(normalizedProject);
            } else {
              console.log('No projects found on server');
            }
          } else {
            console.warn('Failed to fetch projects from server');
          }
        } catch (error) {
          console.error('Failed to load recent project:', error);
        }
      };
      
      loadRecentProject();
    }
  }, [currentProject, currentImageId, isLoading, loadProject]);

  // Update project name state when project changes and explicitly fetch images
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      
      // Explicitly fetch images from server if project has no images yet and we haven't fetched for this project
      const fetchImagesIfNeeded = async () => {
        if (currentProject.images.length === 0 && !fetchedProjectsRef.current.has(currentProject.id)) {
          console.log('Project has no images, fetching from server...');
          fetchedProjectsRef.current.add(currentProject.id); // Mark as fetched to prevent future fetches
          try {
            // Import the store function dynamically to avoid circular imports
            const { useLabelStore } = await import('@/lib/store');
            await useLabelStore.getState().fetchAndMergeServerImages(currentProject.id);
            console.log('Images fetched from server for project:', currentProject.id);
          } catch (error) {
            console.error('Failed to fetch images from server:', error);
            // Remove from fetched set on error so we can retry
            fetchedProjectsRef.current.delete(currentProject.id);
          }
        } else {
          console.log('Project already has', currentProject.images.length, 'images loaded');
        }
      };
      
      fetchImagesIfNeeded();
    }
  }, [currentProject?.id, currentProject?.name]); // Only depend on project ID and name, not the entire project object

  // Debug images loading
  useEffect(() => {
    if (currentProject) {
      console.log('=== IMAGES DEBUG ===');
      console.log('Project ID:', currentProject.id);
      console.log('Project name:', currentProject.name);
      console.log('Images count:', currentProject.images?.length || 0);
      console.log('Images:', currentProject.images?.map(img => ({
        id: img.id,
        name: img.name,
        url: img.url,
        cloudinary: img.cloudinary?.secure_url
      })));
    }
  }, [currentProject?.images]);

  // Set first image as current if none selected
  useEffect(() => {
    if (currentProject && currentProject.images.length > 0 && !currentImageId) {
      console.log('Setting first image as current:', currentProject.images[0].name);
      // Use setTimeout to ensure state is properly updated
      setTimeout(() => {
        setCurrentImage(currentProject.images[0].id);
      }, 100);
    }
  }, [currentProject?.id, currentProject?.images?.length, currentImageId, setCurrentImage]); // More specific dependencies

  // Handle container resize
  useEffect(() => {
    const updateContainerSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateContainerSize();
    
    const resizeObserver = new ResizeObserver(updateContainerSize);
    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!currentProject) return;

    const interval = setInterval(() => {
      saveToIndexedDB();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentProject, saveToIndexedDB]);

  const handleProjectNameSave = () => {
    if (projectName.trim() && projectName !== currentProject?.name) {
      updateProjectName(projectName.trim());
    }
    setIsEditingName(false);
  };

  const handleProjectNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProjectNameSave();
    } else if (e.key === 'Escape') {
      setProjectName(currentProject?.name || '');
      setIsEditingName(false);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePdfUpload = async (pdfFiles: File[]) => {
    if (!currentProject) {
      console.error('No current project for PDF upload');
      toast.error('No project selected for PDF upload');
      return;
    }

    for (const pdfFile of pdfFiles) {
      const toastId = toast.loading(`Processing PDF: ${pdfFile.name}...`);
      
      try {
        // Validate file size before upload (Vercel has 4.5MB limit)
        const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
        if (pdfFile.size > maxSize) {
          const currentSizeMB = Math.round(pdfFile.size / 1024 / 1024 * 100) / 100;
          toast.error(`File "${pdfFile.name}" is too large (${currentSizeMB}MB). Maximum size allowed is 4.5MB.`, {
            id: toastId,
            duration: 5000
          });
          continue; // Skip this file and continue with others
        }

        // Validate file type
        if (pdfFile.type !== 'application/pdf') {
          toast.error(`File "${pdfFile.name}" is not a PDF file. Only PDF files are allowed.`, {
            id: toastId,
            duration: 5000
          });
          continue; // Skip this file and continue with others
        }

        toast.loading(`Uploading PDF: ${pdfFile.name}...`, { id: toastId });
        console.log(`📄 Starting upload for: ${pdfFile.name} (${Math.round(pdfFile.size / 1024 / 1024 * 100) / 100}MB)`);

        const formData = new FormData();
        formData.append('file', pdfFile);
        
        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          let errorMessage = `Failed to upload PDF: ${response.statusText}`;
          
          // Handle specific error cases
          if (response.status === 413) {
            errorMessage = `File "${pdfFile.name}" is too large for Vercel deployment. Maximum size is 4.5MB.`;
          } else if (response.status === 400) {
            try {
              const errorData = await response.json();
              errorMessage = errorData.details || errorData.error || errorMessage;
            } catch (e) {
              // Keep default error message if JSON parsing fails
            }
          }
          
          toast.error(errorMessage, { 
            id: toastId,
            duration: 5000 
          });
          continue;
        }

        toast.loading(`Converting PDF pages to images...`, { id: toastId });
        
        const result = await response.json();
        console.log('PDF uploaded successfully:', result);
        console.log('PDF orientation:', result.orientation);
        console.log('PDF dimensions:', { width: result.width, height: result.height });
        
        
      } catch (error) {
        console.error('Error uploading PDF:', error);
        toast.error(`Failed to upload PDF: ${pdfFile.name}. ${error instanceof Error ? error.message : 'Unknown error'}`, {
          id: toastId,
          duration: 5000
        });
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('Selected files:', files.map(f => ({ name: f.name, type: f.type })));
    
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (imageFiles.length === 0 && pdfFiles.length === 0) {
      toast.error('No valid image or PDF files selected');
      return;
    }

    let toastId: string | number | undefined;

    try {
      // Handle regular images
      if (imageFiles.length > 0) {
        toastId = toast.loading(`Uploading ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}...`);
        console.log('Uploading images:', imageFiles.map(f => f.name));
        await addImages(imageFiles);
        
        toast.success(`Successfully uploaded ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}`, {
          id: toastId,
          duration: 3000
        });
      }
      
      // Handle PDF files
      if (pdfFiles.length > 0) {
        console.log('Processing PDFs:', pdfFiles.map(f => f.name));
        await handlePdfUpload(pdfFiles);
      }
      
      console.log('All files processed successfully');
    } catch (error) {
      console.error('Failed to process files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (toastId) {
        toast.error(`Failed to process files: ${errorMessage}`, {
          id: toastId,
          duration: 5000
        });
      } else {
        toast.error(`Failed to process files: ${errorMessage}`, {
          duration: 5000
        });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files.map(f => ({ name: f.name, type: f.type })));
    
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (imageFiles.length === 0 && pdfFiles.length === 0) {
      toast.error('No valid image or PDF files found in dropped files');
      return;
    }

    let toastId: string | number | undefined;

    try {
      // Handle regular images
      if (imageFiles.length > 0) {
        toastId = toast.loading(`Processing ${imageFiles.length} dropped image${imageFiles.length > 1 ? 's' : ''}...`);
        console.log('Uploading dropped images:', imageFiles.map(f => f.name));
        await addImages(imageFiles);
        
        toast.success(`Successfully processed ${imageFiles.length} dropped image${imageFiles.length > 1 ? 's' : ''}`, {
          id: toastId,
          duration: 3000
        });
      }
      
      // Handle PDF files
      if (pdfFiles.length > 0) {
        console.log('Processing dropped PDFs:', pdfFiles.map(f => f.name));
        await handlePdfUpload(pdfFiles);
      }
      
      console.log('All dropped files processed successfully');
    } catch (error) {
      console.error('Failed to process dropped files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (toastId) {
        toast.error(`Failed to process dropped files: ${errorMessage}`, {
          id: toastId,
          duration: 5000
        });
      } else {
        toast.error(`Failed to process dropped files: ${errorMessage}`, {
          duration: 5000
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No Project Loaded</h2>
          <p className="text-muted-foreground mb-6">
            Please go back to the home page and create or load a project.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
  <header className="border-b brand-header px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            
            <div className="flex items-center space-x-2">
              {isEditingName ? (
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleProjectNameSave}
                  onKeyDown={handleProjectNameKeyPress}
                  className="w-64"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-lg font-semibold cursor-pointer hover:text-primary"
                  onClick={() => setIsEditingName(true)}
                >
                  {currentProject.name}
                </h1>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImageUpload}
              className="flex items-center text-[hsl(var(--brand-green-light))] hover:text-[hsl(var(--brand-green-base))] border-[hsl(var(--brand-green-light))]"
            >
              <Upload className="w-4 h-4 mr-1" />
              Add Images
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveToIndexedDB()}
              disabled={isSaving}
              className="text-[hsl(var(--brand-green-light))] hover:text-[hsl(var(--brand-green-base))] border-[hsl(var(--brand-green-light))]"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            {role === 'admin' && (
              <ExportDialog 
                trigger={
                  <Button variant="outline" size="sm" className="text-[hsl(var(--brand-green-light))] hover:text-[hsl(var(--brand-green-base))] border-[hsl(var(--brand-green-light))]">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                } 
              />
            )}
          </div>
        </div>
      </header>

      {/* Main content with proper scrolling */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - Class panel */}
  <div className="w-80 border-r bg-card flex flex-col flex-shrink-0 brand-subtle-panel">
          <ErrorBoundary>
            <ClassPanel />
          </ErrorBoundary>
        </div>

        {/* Main area with scroll */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar - always visible */}
          <div className="flex-shrink-0">
            <ErrorBoundary>
              <Toolbar />
            </ErrorBoundary>
          </div>

          {/* Canvas area - scrollable if needed */}
          <div className="flex-1 relative min-h-96 overflow-auto">
            <div 
              className="min-h-full relative" 
              ref={canvasContainerRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
            {currentImage ? (
              <CanvasStage
                image={currentImage}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">No Image Selected</div>
                  <div className="text-sm mb-4">
                    {currentProject.images.length === 0 
                      ? 'Upload images to start labeling'
                      : 'Select an image from the strip below'
                    }
                  </div>
                  {currentProject.images.length === 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground mb-3">
                        Drop images here or click Add Images button
                      </div>
                      <Button onClick={handleImageUpload} variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Add Images
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Image strip - always visible at bottom */}
          <div className="flex-shrink-0">
            <ErrorBoundary>
              <ImageStrip />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Global keyboard shortcuts listener */}
      <div className="sr-only" tabIndex={-1} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
