'use client';

import React, { useRef, useEffect } from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageItem } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';
import Image from 'next/image';

export function ImageStrip() {
  const {
    currentProject,
    currentImageId,
    setCurrentImage,
    removeImage,
    getBBoxesForImage,
  } = useLabelStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  const images = currentProject?.images || [];
  const currentIndex = currentImageId && images.length > 0
    ? images.findIndex(img => img.id === currentImageId)
    : -1;

  // Debug images in ImageStrip
  useEffect(() => {
    console.log('=== IMAGE STRIP DEBUG ===');
    console.log('Current project:', currentProject?.name);
    console.log('Images count:', images.length);
    console.log('Current image ID:', currentImageId);
    console.log('Current index:', currentIndex);
    if (images.length > 0) {
      console.log('First image:', images[0].name, images[0].url);
    }
  }, [currentProject, images, currentImageId, currentIndex]);

  // Auto-scroll to current image
  useEffect(() => {
    if (currentImageId && scrollRef.current) {
      const currentElement = scrollRef.current.querySelector(`[data-image-id="${currentImageId}"]`);
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [currentImageId]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentImage(images[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentImage(images[currentIndex + 1].id);
    }
  };

  useEffect(() => {
    const handleKeyNavigation = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle keys when input is focused
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyNavigation);
    return () => window.removeEventListener('keydown', handleKeyNavigation);
  }, [currentIndex, images.length, handlePrevious, handleNext]);

  const getImageStatus = (image: ImageItem) => {
    if (!image?.id) return 'new';
    const bboxes = getBBoxesForImage(image.id);
    return (bboxes && bboxes.length > 0) ? 'labeled' : 'new';
  };

  if (!images || images.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center border-t bg-muted/30">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3" />
          <p className="text-base font-medium">No images loaded</p>
          <p className="text-sm">Upload images to start labeling</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-background min-h-36">
      {/* Navigation controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm font-medium text-foreground">
            {currentIndex + 1} of {images.length}
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex >= images.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Use ← → keys to navigate
        </div>
      </div>

      {/* Image thumbnails */}
      <ScrollArea ref={scrollRef} className="h-32">
        <div className="flex space-x-3 p-3 min-w-max">
          {images.map((image) => {
            const isSelected = image.id === currentImageId;
            const status = getImageStatus(image);
            const bboxCount = getBBoxesForImage(image.id).length;

            return (
              <div
                key={image.id}
                data-image-id={image.id}
                className={`
                  group relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden
                  border-2 transition-all duration-200 shadow-sm hover:shadow-md
                  ${isSelected 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-105' 
                    : 'border-border hover:border-primary/50 hover:scale-102'
                  }
                `}
                onClick={() => setCurrentImage(image.id)}
              >
                {/* Thumbnail */}
                <div className="relative w-28 h-20 bg-muted">
                  {/* Prefer Cloudinary URL, fall back to generic url, then blobUrl */}
                  {(() => {
                    const src = image.cloudinary?.secure_url ?? image.url ?? image.blobUrl ?? '';
                    
                    // Debug logging for thumbnail src
                    if (!src) {
                      console.warn(`[ImageStrip] No src available for image ${image.name}:`, {
                        cloudinary_secure_url: image.cloudinary?.secure_url,
                        url: image.url,
                        blobUrl: image.blobUrl,
                        image
                      });
                    } else {
                      console.log(`[ImageStrip] Using src for ${image.name}:`, src);
                    }
                    
                    if (!src) {
                      // Show placeholder if no image source available
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-muted border-2 border-dashed border-muted-foreground/25">
                          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                      );
                    }
                    
                    return (
                      <img
                        src={src}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                        onLoad={() => {
                          console.log(`[ImageStrip] ✅ Successfully loaded thumbnail for ${image.name}`);
                        }}
                        onError={(e) => {
                          console.error(`[ImageStrip] ❌ Failed to load thumbnail for ${image.name} with src:`, src);
                          // Try other available URLs as fallbacks
                          const el = e.currentTarget as HTMLImageElement;
                          const fallbacks = [
                            image.url,
                            image.blobUrl,
                            image.cloudinary?.secure_url
                          ].filter(url => url && url !== el.src);
                          
                          const nextFallback = fallbacks[0];
                          console.log(`[ImageStrip] Trying fallback for ${image.name}:`, nextFallback);
                          
                          if (nextFallback) {
                            el.src = nextFallback;
                          } else {
                            // Show error placeholder
                            el.style.display = 'none';
                            const parent = el.parentElement;
                            if (parent && !parent.querySelector('.error-placeholder')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'error-placeholder w-full h-full flex items-center justify-center bg-red-50 border-2 border-red-200';
                              errorDiv.innerHTML = '<span class="text-red-500 text-xs">Error</span>';
                              parent.appendChild(errorDiv);
                            }
                          }
                        }}
                      />
                    );
                  })()}
                  
                  {/* Status badge */}
                  <Badge
                    variant={status === 'labeled' ? 'default' : 'secondary'}
                    className="absolute top-1 left-1 text-xs px-1 py-0"
                  >
                    {bboxCount > 0 ? bboxCount : 'New'}
                  </Badge>

                  {/* Remove button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove ${image.name}?`)) {
                        removeImage(image.id);
                      }
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" />
                  )}
                </div>

                {/* Image info tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                  <div className="truncate font-medium">{image.name}</div>
                  <div className="text-xs opacity-75">
                    {image.width} × {image.height}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
