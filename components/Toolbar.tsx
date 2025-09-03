'use client';

import React from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MousePointer2, 
  Square, 
  Hand, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Grid3X3,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { CanvasMode } from '@/lib/types';

export function Toolbar() {
  const {
    toolState,
    setToolMode,
    viewport,
    setViewport,
    resetViewport,
    isSaving,
    currentProject,
    getBBoxesForImage,
    currentImageId,
  } = useLabelStore();

  const currentImage = currentProject?.images.find(img => img.id === currentImageId);
  const bboxCount = currentImageId && currentProject ? getBBoxesForImage(currentImageId)?.length || 0 : 0;
  const selectedClass = currentProject?.classes.find(c => c.id === toolState.selectedClassId);

  const handleZoomIn = () => {
    const newScale = Math.min(viewport.scale * 1.2, 5);
    setViewport({ scale: newScale });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(viewport.scale / 1.2, 0.1);
    setViewport({ scale: newScale });
  };

  const getModeIcon = (mode: CanvasMode) => {
    switch (mode) {
      case 'select':
        return <MousePointer2 className="w-4 h-4" />;
      case 'draw':
        return <Square className="w-4 h-4" />;
      case 'pan':
        return <Hand className="w-4 h-4" />;
      default:
        return <MousePointer2 className="w-4 h-4" />;
    }
  };

  const getModeLabel = (mode: CanvasMode) => {
    switch (mode) {
      case 'select':
        return 'Select';
      case 'draw':
        return 'Draw';
      case 'pan':
        return 'Pan';
      default:
        return 'Select';
    }
  };

  return (
    <div className="border-b bg-background p-2 overflow-x-auto">
      <div className="flex items-center justify-between min-w-max">
        {/* Left section - Tools */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Mode buttons */}
          {(['select', 'draw', 'pan'] as CanvasMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={toolState.mode === mode ? 'default' : 'outline'}
              onClick={() => setToolMode(mode)}
              className="flex items-center space-x-1"
            >
              {getModeIcon(mode)}
              <span className="hidden sm:inline">{getModeLabel(mode)}</span>
            </Button>
          ))}

          <div className="w-px h-6 bg-border mx-2" />

          {/* Zoom controls */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomOut}
            disabled={viewport.scale <= 0.1}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <span className="text-sm text-muted-foreground px-2 min-w-[4rem] text-center">
            {Math.round(viewport.scale * 100)}%
          </span>

          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomIn}
            disabled={viewport.scale >= 5}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={resetViewport}
            title="Reset zoom and pan"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Center section - Current selection info */}
        <div className="flex items-center space-x-4 flex-shrink-0 mx-4">
          {/* Current class */}
          {selectedClass && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden lg:inline">Class:</span>
              <Badge 
                variant="outline" 
                className="flex items-center space-x-1"
                style={{ borderColor: selectedClass.color }}
              >
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: selectedClass.color }}
                />
                <span>{selectedClass.name}</span>
                <span className="text-xs opacity-70 hidden md:inline">({selectedClass.id})</span>
              </Badge>
            </div>
          )}

          {/* Bbox count */}
          {currentImage && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden lg:inline">Annotations:</span>
              <Badge variant={bboxCount > 0 ? 'default' : 'secondary'}>
                {bboxCount}
              </Badge>
            </div>
          )}

          {/* Image info */}
          {currentImage && (
            <div className="hidden lg:flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{currentImage.width} × {currentImage.height}</span>
            </div>
          )}
        </div>

        {/* Right section - Status */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Auto-save status indicator */}
          {isSaving && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Auto-saving...</span>
            </div>
          )}
          {!isSaving && currentProject && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Shortcuts:</span>
        <span className="bg-muted px-1 rounded">N</span>
        <span>Draw</span>
        <span className="bg-muted px-1 rounded">Space</span>
        <span>Pan</span>
        <span className="bg-muted px-1 rounded">Del</span>
        <span>Delete</span>
        <span className="bg-muted px-1 rounded">1-9</span>
        <span>Select class</span>
        <span className="bg-muted px-1 rounded">←→</span>
        <span>Navigate</span>
      </div>
    </div>
  );
}
