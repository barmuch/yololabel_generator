'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
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
  }, [currentProject, currentImageId, currentImage, isLoading, loadProject]);

  // Update project name state when project changes and explicitly fetch images
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      
      // Explicitly fetch images from server if project has no images yet
      const fetchImagesIfNeeded = async () => {
        if (currentProject.images.length === 0) {
          console.log('Project has no images, fetching from server...');
          try {
            // Import the store function dynamically to avoid circular imports
            const { useLabelStore } = await import('@/lib/store');
            await useLabelStore.getState().fetchAndMergeServerImages(currentProject.id);
            console.log('Images fetched from server for project:', currentProject.id);
          } catch (error) {
            console.error('Failed to fetch images from server:', error);
          }
        } else {
          console.log('Project already has', currentProject.images.length, 'images loaded');
        }
      };
      
      fetchImagesIfNeeded();
    }
  }, [currentProject]);

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
  }, [currentProject, currentImageId, setCurrentImage]);

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
      return;
    }

    for (const pdfFile of pdfFiles) {
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        
        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload PDF: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('PDF uploaded successfully:', result);
        console.log('PDF orientation:', result.orientation);
        console.log('PDF dimensions:', { width: result.width, height: result.height });
        
        // Convert PDF pages to ImageItems and add to project
        const { generateAllPdfPageUrls } = await import('@/lib/cloudinary-pdf');
        const pdfPages = generateAllPdfPageUrls(result.publicId, result.pageCount, {
          preserveAspectRatio: true,
          quality: 'auto:best',
          maxWidth: 1200
        });
        
        console.log('Generated PDF pages:', pdfPages.map(p => ({ 
          pageNumber: p.pageNumber, 
          url: p.url 
        })));
        
        // Save PDF pages to MongoDB via complete upload flow
        try {
          console.log('💾 Saving PDF pages to MongoDB...');
          const saveResponse = await fetch('/api/upload-pdf-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject.id,
              pdfData: result
            }),
          });
          
          if (!saveResponse.ok) {
            throw new Error(`Failed to save PDF to database: ${saveResponse.statusText}`);
          }
          
          const saveResult = await saveResponse.json();
          
          if (!saveResult.success) {
            throw new Error(saveResult.error || 'Failed to save PDF to database');
          }
          
          console.log(`✅ Successfully saved ${saveResult.savedPages} PDF pages to MongoDB`);
          
          // Use the saved image documents from MongoDB
          const imageItems = saveResult.imageDocuments.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            width: doc.width,
            height: doc.height,
            url: doc.url,
            cloudinary: doc.cloudinary,
            status: doc.status,
            originalFormat: doc.originalFormat,
            isPdfPage: doc.isPdfPage,
            pdfPageNumber: doc.pdfPageNumber,
            originalPdfName: doc.originalPdfName
          }));
          
          console.log(`📊 Created ${imageItems.length} image items from saved PDF pages`);
          
          // Add to current project using the store's addImagesFromData function
          await addImagesFromData(imageItems);
          
          console.log('Created image items:', imageItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            url: item.url,
            pageNumber: item.pdfPageNumber
          })));
          
        } catch (saveError) {
          console.error('❌ Failed to save PDF to database:', saveError);
          
          // Fallback: Create image items locally without database persistence
          console.log('📝 Creating PDF pages locally as fallback...');
          
          // Create image items with per-page orientation (fallback mode)
          const imageItems = pdfPages.map(page => {
            // Get page-specific info or fallback to overall PDF info
            const pageInfo = result.pageInfos?.find((p: any) => p.pageNumber === page.pageNumber) || {
              width: result.width,
              height: result.height,
              orientation: result.orientation
            };
            
            // Calculate canvas dimensions for this specific page
            const aspectRatio = pageInfo.width / pageInfo.height;
            let canvasWidth = 1200;
            let canvasHeight = Math.round(canvasWidth / aspectRatio);
            
            // For landscape pages (width > height), prioritize width constraint
            // For portrait pages (height > width), check height constraint  
            if (pageInfo.orientation === 'landscape' || aspectRatio > 1) {
              // Landscape: width is dominant
              if (canvasHeight > 1600) {
                canvasHeight = 1600;
                canvasWidth = Math.round(canvasHeight * aspectRatio);
              }
            } else {
              // Portrait: height is dominant
              if (canvasHeight > 1600) {
                canvasHeight = 1600;
                canvasWidth = Math.round(canvasHeight * aspectRatio);
              }
            }
            
            console.log(`Page ${page.pageNumber} canvas dimensions:`, { 
              canvasWidth, 
              canvasHeight, 
              aspectRatio,
              orientation: pageInfo.orientation,
              originalWidth: pageInfo.width,
              originalHeight: pageInfo.height
            });
            
            return {
              id: `pdf_${result.publicId}_page_${page.pageNumber}`,
              name: `${result.filename} - Page ${page.pageNumber}`,
              width: canvasWidth,
              height: canvasHeight,
              url: page.url,
              cloudinary: {
                public_id: result.publicId,
                secure_url: page.url,
                width: canvasWidth,
                height: canvasHeight,
                format: 'png',
                bytes: 0,
                originalWidth: pageInfo.width,
                originalHeight: pageInfo.height,
                orientation: pageInfo.orientation
              },
              status: 'new' as const,
              originalFormat: 'pdf',
              isPdfPage: true,
              pdfPageNumber: page.pageNumber,
              originalPdfName: result.filename
            };
          });
          
          // Add to current project using the store's addImagesFromData function (fallback mode)
          await addImagesFromData(imageItems);
          
          console.log('Created image items (fallback):', imageItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            url: item.url,
            pageNumber: item.pdfPageNumber
          })));
        }
        
      } catch (error) {
        console.error('Error uploading PDF:', error);
        alert(`Failed to upload PDF: ${pdfFile.name}`);
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
      alert('No valid image or PDF files selected');
      return;
    }

    try {
      // Handle regular images
      if (imageFiles.length > 0) {
        console.log('Uploading images:', imageFiles.map(f => f.name));
        await addImages(imageFiles);
      }
      
      // Handle PDF files
      if (pdfFiles.length > 0) {
        console.log('Processing PDFs:', pdfFiles.map(f => f.name));
        await handlePdfUpload(pdfFiles);
      }
      
      console.log('All files processed successfully');
    } catch (error) {
      console.error('Failed to process files:', error);
      alert('Failed to process files');
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
      alert('No valid image or PDF files found');
      return;
    }

    try {
      // Handle regular images
      if (imageFiles.length > 0) {
        console.log('Uploading dropped images:', imageFiles.map(f => f.name));
        await addImages(imageFiles);
      }
      
      // Handle PDF files
      if (pdfFiles.length > 0) {
        console.log('Processing dropped PDFs:', pdfFiles.map(f => f.name));
        await handlePdfUpload(pdfFiles);
      }
      
      console.log('All dropped files processed successfully');
      await addImages(imageFiles);
      console.log('All dropped files processed successfully');
    } catch (error) {
      console.error('Failed to process dropped files:', error);
      alert('Failed to process dropped files');
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
      <header className="border-b bg-card px-4 py-2 flex-shrink-0">
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
              className="flex items-center"
            >
              <Upload className="w-4 h-4 mr-1" />
              Add Images
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveToIndexedDB()}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            <ExportDialog 
              trigger={
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              } 
            />
          </div>
        </div>
      </header>

      {/* Main content with proper scrolling */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - Class panel */}
        <div className="w-80 border-r bg-card flex flex-col flex-shrink-0">
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
