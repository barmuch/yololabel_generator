'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useLabelStore } from '@/lib/store';
import { BBox, ImageItem } from '@/lib/types';
import { clamp } from '@/lib/utils';

interface CanvasStageProps {
  image: ImageItem;
  containerWidth: number;
  containerHeight: number;
}

// Memoized BBox component for better performance
const BBoxComponent = React.memo(({ 
  bbox, 
  classInfo, 
  isSelected, 
  onBBoxClick, 
  onBBoxTransform,
  toolMode
}: {
  bbox: BBox;
  classInfo: any;
  isSelected: boolean;
  onBBoxClick: (id: string) => void;
  onBBoxTransform: (id: string, attrs: any) => void;
  toolMode: string;
}) => (
  <Rect
    id={`bbox-${bbox.id}`}
    x={bbox.x}
    y={bbox.y}
    width={bbox.w}
    height={bbox.h}
    stroke={classInfo?.color || '#ff0000'}
    strokeWidth={isSelected ? 3 : 2}
    fill="transparent"
    onClick={() => onBBoxClick(bbox.id)}
    onTap={() => onBBoxClick(bbox.id)}
    onTransform={(e) => onBBoxTransform(bbox.id, e.target.attrs)}
    onDragEnd={(e) => onBBoxTransform(bbox.id, e.target.attrs)}
    draggable={toolMode === 'select'}
    opacity={bbox.hidden ? 0.3 : 1}
    listening={!bbox.locked}
    perfectDrawEnabled={false} // Performance optimization
    shadowForStrokeEnabled={false} // Performance optimization
  />
));

export function CanvasStage({ image, containerWidth, containerHeight }: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  
  // Performance optimization: throttle zoom updates
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastWheelTimeRef = useRef<number>(0);

  const {
    getBBoxesForImage,
    addBBox,
    updateBBox,
    removeBBox,
    toolState,
    setSelectedBBox,
    setToolMode,
    viewport,
    setViewport,
    currentProject,
  } = useLabelStore();

  const bboxes = getBBoxesForImage(image.id);
  
  // Get classes from either embedded classes or class set
  const projectClasses = currentProject?.classSet?.classes || currentProject?.classes || [];
  const selectedClass = projectClasses.find(c => c.id === toolState.selectedClassId);

  // Memoize zoom constraints for performance
  const zoomConstraints = useMemo(() => {
    if (!image.width || !image.height) return { minScale: 0.1, maxScale: 5 };
    
    const minScale = Math.min(containerWidth / image.width, containerHeight / image.height) * 0.1;
    const maxScale = 5;
    
    return { minScale, maxScale };
  }, [image.width, image.height, containerWidth, containerHeight]);

  // Load image with fallback handling
  useEffect(() => {
    const loadImageWithFallback = () => {
      const primarySrc = image.cloudinary?.secure_url || image.url;
      const fallbackSrc = image.blobUrl;
      
      console.log('Loading image:', image.name, 'url:', primarySrc);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('Image loaded successfully:', img.width, 'x', img.height);
        setKonvaImage(img);
        imageRef.current = img;
        
        // Calculate initial scale to fit image in container
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        console.log('Setting viewport with scale:', scale);
        setViewport({
          scale,
          x: (containerWidth - img.width * scale) / 2,
          y: (containerHeight - img.height * scale) / 2,
          width: containerWidth,
          height: containerHeight,
        });
      };
      
      img.onerror = (e) => {
        console.error('Failed to load image:', e);
        if (fallbackSrc && img.src !== fallbackSrc) {
          console.log('Trying fallback URL:', fallbackSrc);
          img.src = fallbackSrc;
        } else {
          console.error('No more fallback options available for image:', image.name);
          setKonvaImage(null);
        }
      };
      
      img.src = primarySrc;
    };
    
    loadImageWithFallback();

    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [image.cloudinary?.secure_url, image.url, image.blobUrl, image.name, containerWidth, containerHeight, setViewport]);

  // Handle transformer selection
  useEffect(() => {
    if (!transformerRef.current) return;

    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
    if (toolState.selectedBBoxId && stage) {
      const selectedNode = stage.findOne(`#bbox-${toolState.selectedBBoxId}`);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
    }
  }, [toolState.selectedBBoxId]);

  // Convert stage coordinates to image coordinates
  const stageToImage = useCallback((x: number, y: number) => {
    return {
      x: (x - viewport.x) / viewport.scale,
      y: (y - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  // Convert image coordinates to stage coordinates
  const imageToStage = useCallback((x: number, y: number) => {
    return {
      x: x * viewport.scale + viewport.x,
      y: y * viewport.scale + viewport.y,
    };
  }, [viewport]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (toolState.mode === 'pan') return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Check if clicked on background
    if (e.target === e.target.getStage()) {
      setSelectedBBox(null);
      
      if (toolState.mode === 'draw' && selectedClass) {
        const imagePos = stageToImage(pos.x, pos.y);
        setIsDrawing(true);
        setStartPoint(imagePos);
        setCurrentRect({ x: imagePos.x, y: imagePos.y, w: 0, h: 0 });
      }
    }
  }, [toolState.mode, selectedClass, stageToImage, setSelectedBBox]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !startPoint) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const imagePos = stageToImage(pos.x, pos.y);
    const width = imagePos.x - startPoint.x;
    const height = imagePos.y - startPoint.y;

    setCurrentRect({
      x: width < 0 ? imagePos.x : startPoint.x,
      y: height < 0 ? imagePos.y : startPoint.y,
      w: Math.abs(width),
      h: Math.abs(height),
    });
  }, [isDrawing, startPoint, stageToImage]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentRect && selectedClass && currentRect.w > 10 && currentRect.h > 10) {
      addBBox({
        x: currentRect.x,
        y: currentRect.y,
        w: currentRect.w,
        h: currentRect.h,
        classId: selectedClass.id,
        imageId: image.id,
      });
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [isDrawing, currentRect, selectedClass, addBBox, image.id]);

  // Handle bbox click
  const handleBBoxClick = useCallback((bboxId: string) => {
    setSelectedBBox(bboxId);
  }, [setSelectedBBox]);

  // Handle bbox transform
  const handleBBoxTransform = useCallback((bboxId: string, newAttrs: any) => {
    const scaledWidth = newAttrs.width * newAttrs.scaleX / viewport.scale;
    const scaledHeight = newAttrs.height * newAttrs.scaleY / viewport.scale;

    updateBBox(bboxId, {
      x: newAttrs.x / viewport.scale,
      y: newAttrs.y / viewport.scale,
      w: scaledWidth,
      h: scaledHeight,
    });
  }, [updateBBox, viewport.scale]);

  // Optimized wheel handler with throttling and RAF
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const now = Date.now();
    const timeSinceLastWheel = now - lastWheelTimeRef.current;
    
    // Throttle wheel events to max 60fps
    if (timeSinceLastWheel < 16) {
      return;
    }
    
    lastWheelTimeRef.current = now;

    // Cancel any pending wheel updates
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition() || { x: containerWidth / 2, y: containerHeight / 2 };

    // Optimized scale calculation with faster scaling
    const scaleBy = e.evt.ctrlKey ? 1.15 : 1.08; // Faster zoom with Ctrl
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = oldScale * Math.pow(scaleBy, direction);

    // Use memoized constraints
    const clampedScale = clamp(newScale, zoomConstraints.minScale, zoomConstraints.maxScale);

    // Early exit if scale hasn't changed significantly
    if (Math.abs(clampedScale - oldScale) < 0.001) {
      return;
    }

    // Calculate new position to zoom towards pointer (optimized)
    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      setViewport({
        scale: clampedScale,
        x: newPos.x,
        y: newPos.y,
        width: containerWidth,
        height: containerHeight,
      });
    });

  }, [viewport, containerWidth, containerHeight, zoomConstraints, setViewport]);

  // Handle key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (toolState.selectedBBoxId) {
            removeBBox(toolState.selectedBBoxId);
            setSelectedBBox(null);
          }
          break;
        case 'Escape':
          setSelectedBBox(null);
          break;
        case ' ':
          if (!e.repeat) {
            setToolMode('pan');
          }
          e.preventDefault();
          break;
        default:
          const num = parseInt(e.key);
          if (num >= 1 && num <= 9 && currentProject) {
            const classIndex = num - 1;
            const availableClasses = currentProject.classSet?.classes || currentProject.classes || [];
            if (availableClasses[classIndex]) {
              const selectedClassId = availableClasses[classIndex].id;
              useLabelStore.getState().setSelectedClass(selectedClassId);
            }
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setToolMode('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toolState.selectedBBoxId, removeBBox, setSelectedBBox, setToolMode, currentProject]);

  // Cleanup performance refs on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Memoize bbox list to prevent unnecessary re-renders
  const memoizedBBoxes = useMemo(() => {
    return bboxes.map((bbox) => {
      const classInfo = projectClasses.find(c => c.id === bbox.classId);
      const isSelected = bbox.id === toolState.selectedBBoxId;
      
      return (
        <BBoxComponent
          key={bbox.id}
          bbox={bbox}
          classInfo={classInfo}
          isSelected={isSelected}
          onBBoxClick={handleBBoxClick}
          onBBoxTransform={handleBBoxTransform}
          toolMode={toolState.mode}
        />
      );
    });
  }, [bboxes, projectClasses, toolState.selectedBBoxId, toolState.mode, handleBBoxClick, handleBBoxTransform]);

  if (!konvaImage) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-muted-foreground">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={toolState.mode === 'pan'}
        x={toolState.mode === 'pan' ? undefined : viewport.x}
        y={toolState.mode === 'pan' ? undefined : viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        // Performance optimizations
        pixelRatio={window.devicePixelRatio || 1}
        listening={true}
      >
        <Layer
          // Performance optimizations for layer
          clearBeforeDraw={true}
          hitGraphEnabled={false}
        >
          {/* Background image */}
          <KonvaImage
            name="background-image"
            image={konvaImage}
            x={0}
            y={0}
            width={image.width}
            height={image.height}
            perfectDrawEnabled={false} // Performance optimization
          />

          {/* Existing bboxes - using memoized components */}
          {memoizedBBoxes}

          {/* Current drawing rectangle */}
          {currentRect && (
            <Rect
              x={currentRect.x}
              y={currentRect.y}
              width={currentRect.w}
              height={currentRect.h}
              stroke={selectedClass?.color || '#ff0000'}
              strokeWidth={2}
              fill="transparent"
              dash={[5, 5]}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {/* Transformer for selected bbox */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
            anchorStroke="#4F46E5"
            anchorFill="#fff"
            anchorSize={8}
            borderStroke="#4F46E5"
            borderDash={[3, 3]}
          />
        </Layer>
      </Stage>
    </div>
  );
}