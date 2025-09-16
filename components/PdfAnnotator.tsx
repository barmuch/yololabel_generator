'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download,
  PanelLeftOpen,
  PanelLeftClose,
  FileText,
  Tag
} from 'lucide-react';
import { usePdfStore } from '@/lib/pdf-store';
import { CanvasStage } from '@/components/CanvasStage';
import { ClassDef, BBox } from '@/lib/types';

interface PdfAnnotatorProps {
  classes: ClassDef[];
  onSave?: () => void;
}

export function PdfAnnotator({ classes, onSave }: PdfAnnotatorProps) {
  const {
    currentPdf,
    currentPageNumber,
    setCurrentPage,
    sidebarOpen,
    setSidebarOpen,
    getCurrentPageAnnotations,
    setPageAnnotations,
    getTotalAnnotationCount,
    exportCurrentPageAnnotations,
    exportAllPagesAnnotations
  } = usePdfStore();

  if (!currentPdf) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No PDF loaded</p>
        </div>
      </div>
    );
  }

  const currentPage = currentPdf.pages[currentPageNumber - 1];
  const totalAnnotations = getTotalAnnotationCount();
  const currentPageAnnotations = getCurrentPageAnnotations();

  const handlePreviousPage = () => {
    if (currentPageNumber > 1) {
      setCurrentPage(currentPageNumber - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPageNumber < currentPdf.pageCount) {
      setCurrentPage(currentPageNumber + 1);
    }
  };

  const handleZoomIn = () => {
    // Zoom functionality handled by CanvasStage
    console.log('Zoom in requested');
  };

  const handleZoomOut = () => {
    // Zoom functionality handled by CanvasStage
    console.log('Zoom out requested');
  };

  const handleResetView = () => {
    // Reset view functionality handled by CanvasStage
    console.log('Reset view requested');
  };

  const handleExportCurrent = () => {
    const annotations = exportCurrentPageAnnotations();
    const blob = new Blob([annotations], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPdf.filename}_page_${currentPageNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const allAnnotations = exportAllPagesAnnotations();
    
    // Create a zip-like structure or individual files
    Object.entries(allAnnotations).forEach(([pageNum, annotations]) => {
      const blob = new Blob([annotations], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentPdf.filename}_page_${pageNum}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">PDF Pages</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
          
          {/* PDF Info */}
          <Card className="p-3 mb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Filename:</span>
                <span className="font-medium truncate ml-2">{currentPdf.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pages:</span>
                <span className="font-medium">{currentPdf.pageCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Annotations:</span>
                <Badge variant="secondary">{totalAnnotations}</Badge>
              </div>
            </div>
          </Card>

          {/* Page Thumbnails */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {currentPdf.pages.map((page) => (
                <Card
                  key={page.pageNumber}
                  className={`p-2 cursor-pointer transition-all ${
                    page.pageNumber === currentPageNumber
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentPage(page.pageNumber)}
                >
                  <div className="flex space-x-3">
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="w-16 h-20 object-cover rounded border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Page {page.pageNumber}</div>
                      <div className="text-xs text-gray-500">
                        {currentPageAnnotations.length} annotations
                      </div>
                      {page.pageNumber === currentPageNumber && (
                        <Badge variant="default" className="text-xs mt-1">Current</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </Button>
              )}
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPageNumber <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded">
                  Page {currentPageNumber} of {currentPdf.pageCount}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPageNumber >= currentPdf.pageCount}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <span className="text-sm px-2">Zoom</span>
              
              <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={handleResetView}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCurrent}
                disabled={currentPageAnnotations.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Export Page
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                disabled={totalAnnotations === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Export All
              </Button>
              
              {onSave && (
                <Button onClick={onSave} size="sm">
                  Save Project
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Stage */}
        <div className="flex-1 overflow-hidden">
          {currentPage && (
            <CanvasStage
              image={{
                id: `pdf_${currentPdf.publicId}_page_${currentPageNumber}`,
                name: `${currentPdf.filename} - Page ${currentPageNumber}`,
                width: 1200, // Default PDF page width
                height: 1600, // Default PDF page height
                url: currentPage.url,
                cloudinary: {
                  public_id: currentPdf.publicId,
                  secure_url: currentPage.url,
                  width: 1200,
                  height: 1600,
                  format: 'png',
                  bytes: 0
                }
              }}
              containerWidth={800}
              containerHeight={600}
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t px-4 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>
                <Tag className="w-4 h-4 inline mr-1" />
                {currentPageAnnotations.length} annotations on this page
              </span>
              <span>Ready for annotation</span>
            </div>
            <div>
              Ready for annotation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
