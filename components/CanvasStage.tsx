'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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

export function CanvasStage({ image, containerWidth, containerHeight }: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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
  const selectedClass = currentProject?.classes.find(c => c.id === toolState.selectedClassId);

  // Load image
  useEffect(() => {
    console.log('Loading image:', image.name, 'url:', image.url);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
      setKonvaImage(img);
      imageRef.current = img;
      
      // Calculate initial scale to fit image in container
      const scaleX = containerWidth / img.width;
      const scaleY = containerHeight / img.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
      
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
      console.error('Image src:', image.url);
    };
    
    img.src = image.url;

    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [image.url, containerWidth, containerHeight, setViewport]);

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

    const imagePos = stageToImage(pos.x, pos.y);

    // Check if clicked on background (image or stage)
    if (e.target === stage || e.target.name() === 'background-image') {
      if (toolState.mode === 'draw') {
        // Start drawing new bbox
        setIsDrawing(true);
        setStartPoint(imagePos);
        setCurrentRect({ x: imagePos.x, y: imagePos.y, w: 0, h: 0 });
        setSelectedBBox(null);
      } else {
        // Clear selection
        setSelectedBBox(null);
      }
    }
  }, [toolState.mode, stageToImage, setSelectedBBox]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !startPoint || toolState.mode !== 'draw') return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const imagePos = stageToImage(pos.x, pos.y);

    // Calculate rectangle dimensions
    const x = Math.min(startPoint.x, imagePos.x);
    const y = Math.min(startPoint.y, imagePos.y);
    const w = Math.abs(imagePos.x - startPoint.x);
    const h = Math.abs(imagePos.y - startPoint.y);

    // Clamp to image boundaries
    const clampedX = clamp(x, 0, image.width);
    const clampedY = clamp(y, 0, image.height);
    const clampedW = clamp(w, 0, image.width - clampedX);
    const clampedH = clamp(h, 0, image.height - clampedY);

    setCurrentRect({ x: clampedX, y: clampedY, w: clampedW, h: clampedH });
  }, [isDrawing, startPoint, toolState.mode, stageToImage, image.width, image.height]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentRect && currentRect.w > 5 && currentRect.h > 5) {
      // Create new bbox
      const newBBoxId = addBBox({
        imageId: image.id,
        classId: toolState.selectedClassId,
        x: currentRect.x,
        y: currentRect.y,
        w: currentRect.w,
        h: currentRect.h,
      });
      setSelectedBBox(newBBoxId);
    }

    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [isDrawing, currentRect, addBBox, image.id, toolState.selectedClassId, setSelectedBBox]);

  // Handle bbox click
  const handleBBoxClick = useCallback((bboxId: string) => {
    if (toolState.mode === 'select') {
      setSelectedBBox(bboxId);
    }
  }, [toolState.mode, setSelectedBBox]);

  // Handle bbox transform
  const handleBBoxTransform = useCallback((bboxId: string, newAttrs: any) => {
    const imagePos = stageToImage(newAttrs.x, newAttrs.y);
    const scaledWidth = newAttrs.width * newAttrs.scaleX / viewport.scale;
    const scaledHeight = newAttrs.height * newAttrs.scaleY / viewport.scale;

    // Clamp to image boundaries
    const x = clamp(imagePos.x, 0, image.width - scaledWidth);
    const y = clamp(imagePos.y, 0, image.height - scaledHeight);
    const w = clamp(scaledWidth, 5, image.width - x);
    const h = clamp(scaledHeight, 5, image.height - y);

    updateBBox(bboxId, { x, y, w, h });
  }, [stageToImage, viewport.scale, image.width, image.height, updateBBox]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition() || { x: containerWidth / 2, y: containerHeight / 2 };

    // Calculate new scale
    const scaleBy = 1.05;
    const newScale = e.evt.deltaY > 0 
      ? oldScale / scaleBy 
      : oldScale * scaleBy;

    // Limit zoom range
    const minScale = Math.min(containerWidth / image.width, containerHeight / image.height) * 0.1;
    const maxScale = 5;
    const clampedScale = clamp(newScale, minScale, maxScale);

    // Calculate new position to zoom towards pointer
    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setViewport({
      scale: clampedScale,
      x: newPos.x,
      y: newPos.y,
    });
  }, [viewport, containerWidth, containerHeight, image.width, image.height, setViewport]);

  // Handle key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle keys when input is focused
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (toolState.selectedBBoxId) {
            removeBBox(toolState.selectedBBoxId);
            setSelectedBBox(null);
          }
          break;
        case 'n':
        case 'N':
          setToolMode('draw');
          break;
        case 'Escape':
          setSelectedBBox(null);
          setToolMode('select');
          break;
        case ' ':
          if (!e.repeat) {
            setToolMode('pan');
          }
          e.preventDefault();
          break;
        default:
          // Number keys for class selection
          const num = parseInt(e.key);
          if (num >= 1 && num <= 9 && currentProject) {
            const classIndex = num - 1;
            if (currentProject.classes[classIndex]) {
              // Update selectedClassId in store
              const selectedClassId = currentProject.classes[classIndex].id;
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

  if (!konvaImage) {
    console.log('KonvaImage is null, showing loading state');
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-muted-foreground">Loading image...</div>
      </div>
    );
  }

  console.log('Rendering CanvasStage with image:', image.name, 'containerSize:', containerWidth, 'x', containerHeight);

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
      >
        <Layer>
          {/* Background image */}
          <KonvaImage
            name="background-image"
            image={konvaImage}
            x={0}
            y={0}
            width={image.width}
            height={image.height}
          />

          {/* Existing bboxes */}
          {bboxes.map((bbox) => {
            const classInfo = currentProject?.classes.find(c => c.id === bbox.classId);
            const isSelected = bbox.id === toolState.selectedBBoxId;
            
            return (
              <React.Fragment key={bbox.id}>
                <Rect
                  id={`bbox-${bbox.id}`}
                  x={bbox.x}
                  y={bbox.y}
                  width={bbox.w}
                  height={bbox.h}
                  stroke={classInfo?.color || '#ff0000'}
                  strokeWidth={isSelected ? 3 : 2}
                  fill="transparent"
                  onClick={() => handleBBoxClick(bbox.id)}
                  onTap={() => handleBBoxClick(bbox.id)}
                  onTransform={(e) => handleBBoxTransform(bbox.id, e.target.attrs)}
                  onDragEnd={(e) => handleBBoxTransform(bbox.id, e.target.attrs)}
                  draggable={toolState.mode === 'select'}
                  opacity={bbox.hidden ? 0.3 : 1}
                  listening={!bbox.locked}
                />
                
                {/* Class label */}
                {classInfo && (
                  <Rect
                    x={bbox.x}
                    y={bbox.y - 20}
                    width={classInfo.name.length * 8}
                    height={18}
                    fill={classInfo.color}
                    opacity={0.8}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Current drawing rectangle */}
          {isDrawing && currentRect && selectedClass && (
            <Rect
              x={currentRect.x}
              y={currentRect.y}
              width={currentRect.w}
              height={currentRect.h}
              stroke={selectedClass.color}
              strokeWidth={2}
              fill="transparent"
              dash={[5, 5]}
            />
          )}

          {/* Transformer for selected bbox */}
          {toolState.mode === 'select' && (
            <Transformer
              ref={transformerRef}
              keepRatio={false}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
                'top-center',
                'bottom-center',
                'middle-left',
                'middle-right',
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
