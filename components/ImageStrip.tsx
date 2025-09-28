'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, X, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { ImageItem } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export function ImageStrip() {
  const {
    currentProject,
    currentImageId,
    setCurrentImage,
    removeImage,
    getBBoxesForImage,
    updateImageValidation,
  } = useLabelStore();
  
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const [validatingImages, setValidatingImages] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle image validation (admin only)
  const handleValidateImage = useCallback(async (imageId: string, currentStatus: string) => {
    if (!isAdmin) return;
    
    setValidatingImages(prev => new Set(Array.from(prev).concat(imageId)));
    
    try {
      const action = currentStatus === 'validated' ? 'unvalidate' : 'validate';
      const response = await fetch(`/api/images/${imageId}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update the store immediately
        const validatedBy = action === 'validate' ? (session?.user as any)?.username : undefined;
        updateImageValidation(imageId, action === 'validate', validatedBy);
        console.log('Image validation updated:', result.message);
      } else {
        console.error('Failed to validate image');
      }
    } catch (error) {
      console.error('Error validating image:', error);
    } finally {
      setValidatingImages(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(imageId);
        return newSet;
      });
    }
  }, [isAdmin, session, updateImageValidation]);

  const images = useMemo(() => currentProject?.images || [], [currentProject?.images]);
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
    console.log('User role:', isAdmin ? 'admin' : 'member');
    if (images.length > 0) {
      console.log('First image:', images[0].name, images[0].url);
      console.log('Image validation data:', {
        status: images[0].status,
        validatedBy: images[0].validatedBy,
        validatedAt: images[0].validatedAt
      });
      // Log validation status for all images
      images.forEach((img, idx) => {
        if (img.status === 'validated') {
          console.log(`Image ${idx + 1} (${img.name}): VALIDATED by ${img.validatedBy} at ${img.validatedAt}`);
        }
      });
    }
  }, [currentProject, images, currentImageId, currentIndex, isAdmin]);

  // Auto-scroll to current image
  useEffect(() => {
    if (currentImageId && scrollRef.current) {
      const currentElement = scrollRef.current.querySelector(`[data-image-id="${currentImageId}"]`);
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [currentImageId]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentImage(images[currentIndex - 1].id);
    }
  }, [currentIndex, images, setCurrentImage]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentImage(images[currentIndex + 1].id);
    }
  }, [currentIndex, images, setCurrentImage]);

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

      {/* Validation statistics */}
      {images.length > 0 && (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          {(() => {
            const validatedCount = images.filter(img => img.status === 'validated').length;
            const labeledCount = images.filter(img => img.status === 'labeled').length;
            const totalCount = images.length;
            
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mr-1" />
                    {validatedCount} validated
                  </span>
                  <span className="flex items-center">
                    <Circle className="w-3 h-3 text-orange-500 mr-1" />
                    {labeledCount} labeled
                  </span>
                  <span className="text-muted-foreground/70">
                    Total: {totalCount}
                  </span>
                </div>
                <div className="text-right">
                  <span className={validatedCount === totalCount && totalCount > 0 ? 'text-green-600 font-medium' : ''}>
                    {totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0}% validated
                  </span>
                  {!isAdmin && (
                    <div className="text-[10px] text-blue-500 mt-0.5">
                      👁️ Member view
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
                      <Image
                        src={src}
                        alt={image.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                        onLoad={() => {
                          console.log(`[ImageStrip] ✅ Successfully loaded thumbnail for ${image.name}`);
                        }}
                        onError={(e) => {
                          console.error(`[ImageStrip] ❌ Failed to load thumbnail for ${image.name} with src:`, src);
                          const el = e.currentTarget as HTMLImageElement;
                          
                          // If it's a Cloudinary URL, try different transformations
                          if (src.includes('res.cloudinary.com')) {
                            // Try with smaller quality and format auto
                            const fallbackCloudinaryUrl = src.replace(
                              '/image/upload/',
                              '/image/upload/q_auto,f_auto,w_128,h_128,c_fill/'
                            );
                            
                            if (fallbackCloudinaryUrl !== src) {
                              console.log(`[ImageStrip] Trying Cloudinary fallback for ${image.name}:`, fallbackCloudinaryUrl);
                              el.src = fallbackCloudinaryUrl;
                              return;
                            }
                          }
                          
                          // Try other available URLs as fallbacks
                          const fallbacks = [
                            image.url,
                            image.blobUrl
                          ].filter(url => url && url !== el.src);
                          
                          const nextFallback = fallbacks[0];
                          
                          if (nextFallback) {
                            console.log(`[ImageStrip] Trying fallback for ${image.name}:`, nextFallback);
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
                  {/* Validation status indicator */}
                  {isAdmin ? (
                    /* Admin validation button - interactive */
                    <Button
                      size="sm"
                      variant={image.status === 'validated' ? "default" : "outline"}
                      className="absolute top-1 left-1/2 transform -translate-x-1/2 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleValidateImage(image.id, image.status || 'annotated');
                      }}
                      disabled={validatingImages.has(image.id)}
                    >
                      {validatingImages.has(image.id) ? (
                        <div className="w-3 h-3 animate-spin border border-current border-r-transparent rounded-full" />
                      ) : image.status === 'validated' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                    </Button>
                  ) : (
                    /* Member validation indicator - read-only, always visible */
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-5 h-5 flex items-center justify-center">
                      {image.status === 'validated' ? (
                        <div 
                          className="bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white"
                          title={`Validated by ${image.validatedBy || 'admin'}${image.validatedAt ? ` on ${new Date(image.validatedAt).toLocaleDateString()}` : ''}`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        /* Show status for non-validated images too */
                        <div 
                          className="bg-gray-400 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-gray-300"
                          title={`Status: ${image.status === 'labeled' ? '' : ''}`}
                        >
                          <Circle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  )}

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

                  {/* Persistent validation badge - always visible for validated images at center top */}
                  {!isAdmin && image.status === 'validated' && (
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Status indicator for non-admin users - non-validated images */}
                  {!isAdmin && image.status !== 'validated' && (
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-orange-400 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-orange-300">
                      <Circle className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" />
                  )}
                </div>

                {/* Image info tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium">{image.name}</div>
                    {image.status === 'validated' && (
                      <CheckCircle2 className="w-3 h-3 text-green-400 ml-1 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs opacity-75">
                    <div>{image.width} × {image.height}</div>
                    {image.status === 'validated' ? (
                      <div className="text-green-400 mt-0.5">
                        <span>✓ Validated</span>
                        {image.validatedBy && (
                          <span className="ml-1">by {image.validatedBy}</span>
                        )}
                        {image.validatedAt && (
                          <div className="text-green-300 text-[10px]">
                            {new Date(image.validatedAt).toLocaleDateString()}
                          </div>
                        )}
                        {!isAdmin && (
                          <div className="text-yellow-300 text-[10px] mt-0.5">
                            📋 View only - Admin validation required
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-orange-400 mt-0.5">
                        {image.status === 'labeled' ? '' : ''}
                        {!isAdmin && image.status === 'labeled' && (
                          <div className="text-yellow-300 text-[10px] mt-0.5">
                            📋 Waiting for admin validation
                          </div>
                        )}
                      </div>
                    )}
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
