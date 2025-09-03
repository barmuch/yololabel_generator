'use client';

import React, { useState } from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Download, 
  FileText, 
  Archive, 
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { exportSingleImageYolo, exportClassesTxt, exportDataYaml, exportDatasetZip } from '@/lib/fs';
import { toYoloTxt, generateClassesTxt } from '@/lib/yolo';
import { generateDataYaml } from '@/lib/dataYaml';
import { splitDataset, validateSplitOptions } from '@/lib/split';
import { removeFileExtension } from '@/lib/utils';

interface ExportDialogProps {
  trigger?: React.ReactNode;
}

export function ExportDialog({ trigger }: ExportDialogProps) {
  const {
    currentProject,
    currentImageId,
    getBBoxesForImage,
    exportOptions,
    setExportOptions,
  } = useLabelStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'single' | 'classes' | 'dataset' | 'yaml'>('single');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentImage = currentProject?.images.find(img => img.id === currentImageId);
  const allBboxes = currentProject?.bboxes || [];
  const classes = currentProject?.classes || [];

  const handleExportSingle = async () => {
    if (!currentImage) return;

    setIsExporting(true);
    try {
      const imageBboxes = getBBoxesForImage(currentImage.id);
      await exportSingleImageYolo(currentImage, imageBboxes, classes);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportClasses = async () => {
    if (!classes.length) return;

    setIsExporting(true);
    try {
      await exportClassesTxt(classes);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportYaml = async () => {
    if (!classes.length) return;

    setIsExporting(true);
    try {
      await exportDataYaml(classes);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDataset = async () => {
    if (!currentProject || !currentProject.images.length) return;

    // Validate split options and show errors in UI
    const errors = validateSplitOptions(exportOptions);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous validation errors
    setValidationErrors([]);

    setIsExporting(true);
    try {
      await exportDatasetZip(
        currentProject.images,
        allBboxes,
        classes,
        exportOptions,
        currentProject.name
      );
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getExportStats = () => {
    if (!currentProject) return null;

    const totalImages = currentProject.images.length;
    const labeledImages = currentProject.images.filter(img => {
      const bboxes = getBBoxesForImage(img.id);
      return bboxes.length > 0;
    }).length;

    const totalBboxes = allBboxes.length;
    const classStats = classes.map(cls => ({
      name: cls.name,
      count: allBboxes.filter(bbox => bbox.classId === cls.id).length,
    }));

    return {
      totalImages,
      labeledImages,
      totalBboxes,
      classStats,
    };
  };

  const stats = getExportStats();

  const splitPreview = currentProject?.images.length 
    ? splitDataset(currentProject.images, exportOptions)
    : null;

  if (!currentProject) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Annotations</DialogTitle>
          <DialogDescription>
            Export your annotations in YOLO format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export type selection */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={exportType === 'single' ? 'default' : 'outline'}
              onClick={() => {
                setExportType('single');
                setValidationErrors([]); // Clear validation errors when changing export type
              }}
              disabled={!currentImage}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <FileText className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Current Image</div>
                <div className="text-xs text-muted-foreground">
                  Export single .txt file
                </div>
              </div>
            </Button>

            <Button
              variant={exportType === 'classes' ? 'default' : 'outline'}
              onClick={() => {
                setExportType('classes');
                setValidationErrors([]); // Clear validation errors when changing export type
              }}
              disabled={!classes.length}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <FileText className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Classes</div>
                <div className="text-xs text-muted-foreground">
                  Export classes.txt
                </div>
              </div>
            </Button>

            <Button
              variant={exportType === 'yaml' ? 'default' : 'outline'}
              onClick={() => {
                setExportType('yaml');
                setValidationErrors([]); // Clear validation errors when changing export type
              }}
              disabled={!classes.length}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Settings className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Data YAML</div>
                <div className="text-xs text-muted-foreground">
                  Export data.yaml config
                </div>
              </div>
            </Button>

            <Button
              variant={exportType === 'dataset' ? 'default' : 'outline'}
              onClick={() => {
                setExportType('dataset');
                setValidationErrors([]); // Clear validation errors when changing export type
              }}
              disabled={!currentProject.images.length}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Archive className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Full Dataset</div>
                <div className="text-xs text-muted-foreground">
                  Export complete ZIP
                </div>
              </div>
            </Button>
          </div>

          {/* Dataset split configuration */}
          {exportType === 'dataset' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Dataset Split Configuration</span>
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Train (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={exportOptions.trainSplit}
                    onChange={(e) => {
                      setExportOptions({ trainSplit: Number(e.target.value) });
                      setValidationErrors([]); // Clear validation errors when user edits
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Validation (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={exportOptions.valSplit}
                    onChange={(e) => {
                      setExportOptions({ valSplit: Number(e.target.value) });
                      setValidationErrors([]); // Clear validation errors when user edits
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Test (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={exportOptions.testSplit}
                    onChange={(e) => {
                      setExportOptions({ testSplit: Number(e.target.value) });
                      setValidationErrors([]); // Clear validation errors when user edits
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={exportOptions.splitMethod === 'random'}
                    onChange={() => setExportOptions({ splitMethod: 'random' })}
                  />
                  <span className="text-sm">Random split</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={exportOptions.splitMethod === 'sequential'}
                    onChange={() => setExportOptions({ splitMethod: 'sequential' })}
                  />
                  <span className="text-sm">Sequential split</span>
                </label>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeDataYaml}
                  onChange={(e) => setExportOptions({ includeDataYaml: e.target.checked })}
                />
                <span className="text-sm">Include data.yaml</span>
              </label>

              {/* Validation errors display */}
              {validationErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-700 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Validation Errors:</span>
                  </div>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span>•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Split preview */}
              {splitPreview && validationErrors.length === 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Split Preview:</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>Train: {splitPreview.train.length} images</div>
                    <div>Val: {splitPreview.val.length} images</div>
                    <div>Test: {splitPreview.test.length} images</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export statistics */}
          {stats && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Export Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between">
                    <span>Total Images:</span>
                    <span className="font-medium">{stats.totalImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labeled Images:</span>
                    <span className="font-medium text-green-600">{stats.labeledImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Annotations:</span>
                    <span className="font-medium">{stats.totalBboxes}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Per Class:</div>
                  {stats.classStats.map((stat, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>{stat.name}:</span>
                      <span>{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Current image info */}
          {exportType === 'single' && currentImage && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Current Image</h4>
              <div className="text-sm space-y-1">
                <div>Name: {currentImage.name}</div>
                <div>Size: {currentImage.width} × {currentImage.height}</div>
                <div>Annotations: {getBBoxesForImage(currentImage.id).length}</div>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            
            <Button
              onClick={() => {
                switch (exportType) {
                  case 'single':
                    handleExportSingle();
                    break;
                  case 'classes':
                    handleExportClasses();
                    break;
                  case 'yaml':
                    handleExportYaml();
                    break;
                  case 'dataset':
                    handleExportDataset();
                    break;
                }
              }}
              disabled={isExporting || (
                exportType === 'single' && !currentImage
              ) || (
                exportType === 'classes' && !classes.length
              ) || (
                exportType === 'dataset' && !currentProject.images.length
              )}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
