'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Group, Image as KonvaImage, Rect, Transformer } from 'react-konva';
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
const BBoxComponent = React.memo(function BBoxComponent({ 
  bbox, 
  classInfo, 
  isSelected, 
  isHovered,
  onBBoxClick, 
  onBBoxTransform,
  toolMode,
  onHoverChange,
}: {
  bbox: BBox;
  classInfo: any;
  isSelected: boolean;
  isHovered: boolean;
  onBBoxClick: (id: string, e: KonvaEventObject<MouseEvent>) => void;
  onBBoxTransform: (id: string, attrs: any) => void;
  toolMode: string;
  onHoverChange: (id: string | null) => void;
}) {
  return (
    <Rect
      id={`bbox-${bbox.id}`}
      x={bbox.x}
      y={bbox.y}
      width={bbox.w}
      height={bbox.h}
      stroke={classInfo?.color || '#ff0000'}
      strokeWidth={isSelected ? 3 : 2}
      fill={isSelected ? (classInfo?.color || '#ff0000') + '33' : (isHovered ? (classInfo?.color || '#ff0000') + '22' : 'transparent')}
      onClick={(e) => onBBoxClick(bbox.id, e)}
  onTap={(e) => onBBoxClick(bbox.id, e as unknown as KonvaEventObject<MouseEvent>)}
      onMouseEnter={() => toolMode === 'select' && onHoverChange(bbox.id)}
      onMouseLeave={() => toolMode === 'select' && onHoverChange(null)}
      onTransform={(e) => onBBoxTransform(bbox.id, e.target.attrs)}
      onDragEnd={(e) => onBBoxTransform(bbox.id, e.target.attrs)}
      draggable={toolMode === 'select'}
      opacity={bbox.hidden ? 0.3 : 1}
      listening={!bbox.locked}
      perfectDrawEnabled={false} // Performance optimization
      shadowForStrokeEnabled={false} // Performance optimization
    />
  );
});

export function CanvasStage({ image, containerWidth, containerHeight }: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{x:number;y:number}|null>(null);
  const viewportStartRef = useRef<{x:number;y:number}>({x:0,y:0});
  const [hoveredBBoxId, setHoveredBBoxId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
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

  // Handle hover change with tooltip positioning
  const handleHoverChange = useCallback((bboxId: string | null) => {
    setHoveredBBoxId(bboxId);
    if (bboxId && stageRef.current) {
      const stage = stageRef.current;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        setTooltipPosition({ x: pointer.x, y: pointer.y });
      }
    } else {
      setTooltipPosition(null);
    }
  }, []);

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
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (toolState.mode === 'pan') {
      isPanningRef.current = true;
      panStartRef.current = pos;
      viewportStartRef.current = { x: viewport.x, y: viewport.y };
      // Prevent text selection / dragging artifacts
      e.evt.preventDefault();
      return;
    }

    const target: any = e.target;
    const targetId: string | undefined = target?.id?.();
    const targetName: string | undefined = target?.name?.();
    const targetClass: string | undefined = target?.getClassName?.();
    const isBackground = target === stage || targetName === 'background-image' || targetClass === 'Group';

    // Clear selection when clicking blank area in select mode
    if (toolState.mode === 'select' && isBackground) {
      if (toolState.selectedBBoxId) setSelectedBBox(null);
    }

    // Prevent starting new rectangle directly on existing bbox node
    if (toolState.mode === 'draw' && targetId && targetId.startsWith('bbox-')) {
      return;
    }

    if (toolState.mode === 'draw' && selectedClass && isBackground) {
      const imagePos = stageToImage(pos.x, pos.y);
      if (imagePos.x >= 0 && imagePos.y >= 0 && imagePos.x <= image.width && imagePos.y <= image.height) {
        setIsDrawing(true);
        setStartPoint(imagePos);
        setCurrentRect({ x: imagePos.x, y: imagePos.y, w: 0, h: 0 });
      }
    }
  }, [toolState.mode, toolState.selectedBBoxId, selectedClass, stageToImage, setSelectedBBox, viewport.x, viewport.y, image.width, image.height]);

  // Fallback pan handlers on container (covers cases when HTML overlay intercepts initial mousedown)
  const containerMouseDown = useCallback((e: React.MouseEvent) => {
    if (toolState.mode !== 'pan') return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isPanningRef.current = true;
    panStartRef.current = pos;
    viewportStartRef.current = { x: viewport.x, y: viewport.y };
    e.preventDefault();
  }, [toolState.mode, viewport.x, viewport.y]);

  const containerMouseMove = useCallback((e: React.MouseEvent) => {
    if (toolState.mode !== 'pan' || !isPanningRef.current || !panStartRef.current) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dx = (pos.x - panStartRef.current.x);
    const dy = (pos.y - panStartRef.current.y);
    setViewport({ x: viewportStartRef.current.x + dx, y: viewportStartRef.current.y + dy });
  }, [toolState.mode, setViewport]);

  const containerMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
    }
  }, []);

  // Ensure drawing state resets when leaving draw mode
  useEffect(() => {
    if (toolState.mode !== 'draw' && (isDrawing || currentRect)) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
    }
  }, [toolState.mode, isDrawing, currentRect]);

  // Global mouseup safety (in case cursor leaves canvas while panning)
  useEffect(() => {
    const up = () => { if (isPanningRef.current) { isPanningRef.current = false; panStartRef.current = null; } };
    window.addEventListener('mouseup', up);
    window.addEventListener('mouseleave', up);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mouseleave', up); };
  }, []);

  // Handle mouse move
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (toolState.mode === 'pan' && isPanningRef.current) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos || !panStartRef.current) return;
      const dx = pos.x - panStartRef.current.x;
      const dy = pos.y - panStartRef.current.y;
      setViewport({ x: viewportStartRef.current.x + dx, y: viewportStartRef.current.y + dy });
      return;
    }
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
    if (toolState.mode === 'pan') {
      isPanningRef.current = false;
      panStartRef.current = null;
      return;
    }
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
  }, [isDrawing, currentRect, selectedClass, addBBox, image.id, toolState.mode]);

  // Handle bbox click
  const handleBBoxClick = useCallback((bboxId: string, e: KonvaEventObject<MouseEvent | Event>) => {
    const native = e.evt as MouseEvent;
    console.log('[BBoxClick] id=', bboxId, 'mode=', toolState.mode, 'selected=', toolState.selectedBBoxId, 'alt?', native?.altKey);
    if (toolState.mode === 'erase' || (native && native.altKey)) {
      console.log('[BBoxClick] Deleting bbox via mode/alt path');
      removeBBox(bboxId);
      if (toolState.selectedBBoxId === bboxId) setSelectedBBox(null);
      return;
    }
    if (toolState.mode === 'select') {
      console.log('[BBoxClick] Selecting bbox');
      setSelectedBBox(bboxId);
    } else {
      console.log('[BBoxClick] Ignored click (mode not select/erase)');
    }
  }, [removeBBox, setSelectedBBox, toolState.mode, toolState.selectedBBoxId]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- viewport object spread is intentional; setViewport is stable
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
        case 'd':
        case 'D':
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
        case 'n':
        case 'N':
          setToolMode('draw');
          break;
        case 'e':
        case 'E':
          setToolMode('erase');
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
        // Only revert to select if currently pan (avoid overwriting user-chosen draw mode)
        if (useLabelStore.getState().toolState.mode === 'pan') {
          setToolMode('select');
        }
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
      const wheelTimeout = wheelTimeoutRef.current;
      const animationFrame = animationFrameRef.current;
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Memoize bbox list to prevent unnecessary re-renders
  const memoizedBBoxes = useMemo(() => {
    return bboxes
      .filter(b => b.imageId === image.id) // guard against mismatched imageId
      .map((bbox) => {
      const classInfo = projectClasses.find(c => c.id === bbox.classId);
  const isSelected = bbox.id === toolState.selectedBBoxId && toolState.mode !== 'erase';
  const isHovered = bbox.id === hoveredBBoxId;
      return (
        <BBoxComponent
          key={bbox.id}
          bbox={bbox}
          classInfo={classInfo}
          isSelected={isSelected}
          isHovered={isHovered}
          onBBoxClick={handleBBoxClick}
          onBBoxTransform={handleBBoxTransform}
          toolMode={toolState.mode}
          onHoverChange={handleHoverChange}
        />
      );
    });
  }, [bboxes, projectClasses, toolState.selectedBBoxId, toolState.mode, handleBBoxClick, handleBBoxTransform, hoveredBBoxId, image.id, handleHoverChange]);

  if (!konvaImage) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-muted-foreground">Loading image...</div>
      </div>
    );
  }

  return (
    <div
      className={"w-full h-full overflow-hidden relative " + (toolState.mode === 'erase' ? 'cursor-crosshair' : toolState.mode === 'select' ? 'cursor-pointer' : toolState.mode === 'pan' ? (isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default')}
      onMouseDown={containerMouseDown}
      onMouseMove={containerMouseMove}
      onMouseUp={containerMouseUp}
    >
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => {
          if (toolState.mode === 'erase') {
            const tgt: any = e.target;
            console.log('[StageClick] erase mode target id=', tgt?.id?.(), 'name=', tgt?.name?.());
          }
        }}
        x={0}
        y={0}
        scaleX={1}
        scaleY={1}
        pixelRatio={window.devicePixelRatio || 1}
        listening={true}
      >
        <Layer
          // Keep clearBeforeDraw for perf but re-enable hit graph so clicks register
          clearBeforeDraw={true}
          hitGraphEnabled={true}
        >
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale} listening={true}>
            {/* Background image */}
            <KonvaImage
              name="background-image"
              image={konvaImage}
              x={0}
              y={0}
              width={image.width}
              height={image.height}
              perfectDrawEnabled={false}
            />
            {/* Existing bboxes */}
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
          </Group>

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
      {toolState.mode === 'select' && toolState.selectedBBoxId && (() => {
        const sel = bboxes.find(b => b.id === toolState.selectedBBoxId);
        if (!sel) return null;
        const left = sel.x * viewport.scale + viewport.x + sel.w * viewport.scale - 4;
        const top = sel.y * viewport.scale + viewport.y - 28;
        return (
          <button
            type="button"
            onClick={() => { removeBBox(sel.id); setSelectedBBox(null); }}
            className="absolute z-20 text-[10px] px-2 py-1 rounded bg-red-600 text-white shadow hover:bg-red-700 focus:outline-none"
            style={{ left, top }}
            title="Delete annotation (Del / Alt+Click / D)"
          >Del</button>
        );
      })()}
      {toolState.mode === 'select' && toolState.selectedBBoxId && (
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded text-xs text-white">
          <span>ID: {toolState.selectedBBoxId}</span>
          <button
            onClick={() => { console.log('[FallbackDeletePanel] remove', toolState.selectedBBoxId); removeBBox(toolState.selectedBBoxId!); setSelectedBBox(null); }}
            className="bg-red-600 hover:bg-red-700 transition-colors px-2 py-1 rounded"
          >Delete</button>
        </div>
      )}
      
      {/* Hover Tooltip */}
      {toolState.mode === 'select' && hoveredBBoxId && tooltipPosition && (() => {
        const hoveredBBox = bboxes.find(b => b.id === hoveredBBoxId);
        const classInfo = projectClasses.find(c => c.id === hoveredBBox?.classId);
        if (!hoveredBBox || !classInfo) return null;
        
        return (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 30,
            }}
          >
            <div className="bg-black/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-lg border border-white/20">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: classInfo.color }}
                />
                <span className="font-medium">{classInfo.name}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}