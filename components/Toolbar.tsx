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
  Save,
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
    saveToIndexedDB,
    isSaving,
    currentProject,
    getBBoxesForImage,
    currentImageId,
  } = useLabelStore();

  const currentImage = currentProject?.images.find(img => img.id === currentImageId);
  const bboxCount = currentImageId ? getBBoxesForImage(currentImageId).length : 0;
  const selectedClass = currentProject?.classes.find(c => c.id === toolState.selectedClassId);

  const handleZoomIn = () => {
    const newScale = Math.min(viewport.scale * 1.2, 5);
    setViewport({ scale: newScale });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(viewport.scale / 1.2, 0.1);
    setViewport({ scale: newScale });
  };

  const handleSave = async () => {
    try {
      await saveToIndexedDB();
    } catch (error) {
      console.error('Failed to save:', error);
    }
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
    <div className="border-b bg-background p-2">
      <div className="flex items-center justify-between">
        {/* Left section - Tools */}
        <div className="flex items-center space-x-1">
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
        <div className="flex items-center space-x-4">
          {/* Current class */}
          {selectedClass && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Class:</span>
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
                <span className="text-xs opacity-70">({selectedClass.id})</span>
              </Badge>
            </div>
          )}

          {/* Bbox count */}
          {currentImage && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Annotations:</span>
              <Badge variant={bboxCount > 0 ? 'default' : 'secondary'}>
                {bboxCount}
              </Badge>
            </div>
          )}

          {/* Image info */}
          {currentImage && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{currentImage.width} × {currentImage.height}</span>
            </div>
          )}
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center space-x-1">
          {/* Save button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !currentProject}
            className="flex items-center space-x-1"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isSaving ? 'Saving...' : 'Save'}
            </span>
          </Button>

          {/* Export button */}
          <Button
            size="sm"
            variant="outline"
            disabled={!currentProject || !currentProject.images.length}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
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
