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
  const currentIndex = currentImageId 
    ? images.findIndex(img => img.id === currentImageId)
    : -1;

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
    const bboxes = getBBoxesForImage(image.id);
    return bboxes.length > 0 ? 'labeled' : 'new';
  };

  if (images.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center border-t bg-muted/50">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No images loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-background">
      {/* Navigation controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground">
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

        <div className="text-xs text-muted-foreground">
          Use ← → keys to navigate
        </div>
      </div>

      {/* Image thumbnails */}
      <ScrollArea ref={scrollRef} className="h-24">
        <div className="flex space-x-2 p-2">
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
                  border-2 transition-all
                  ${isSelected 
                    ? 'border-primary shadow-md' 
                    : 'border-transparent hover:border-muted-foreground/50'
                  }
                `}
                onClick={() => setCurrentImage(image.id)}
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-16 bg-muted">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
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
                <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="truncate">{image.name}</div>
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
