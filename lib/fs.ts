import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem, BBox, ClassDef, ExportOptions } from './types';
import { toYoloTxt, generateClassesTxt } from './yolo';
import { generateDataYaml } from './dataYaml';
import { splitDataset } from './split';
import { removeFileExtension } from './utils';
import { convertImageToYoloFormat, getImageFormatFromImageItem } from './pdf-utils';

/**
 * File System Access API utilities for modern browsers
 */

/**
 * Check if File System Access API is supported
 */
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 
         'showOpenFilePicker' in window && 
         'showSaveFilePicker' in window && 
         'showDirectoryPicker' in window;
}

/**
 * Open file picker dialog
 */
export async function openFilePicker(options: {
  multiple?: boolean;
  accept?: Record<string, string[]>;
}): Promise<File[]> {
  if (supportsFileSystemAccess()) {
    const fileHandles = await (window as any).showOpenFilePicker({
      multiple: options.multiple,
      types: options.accept ? [{
        description: 'Images',
        accept: options.accept,
      }] : undefined,
    });
    
    const files: File[] = [];
    for (const handle of fileHandles) {
      files.push(await handle.getFile());
    }
    return files;
  } else {
    // Fallback to input element
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple || false;
      
      if (options.accept) {
        const acceptString = Object.values(options.accept).flat().join(',');
        input.accept = acceptString;
      }
      
      input.addEventListener('change', () => {
        const files = Array.from(input.files || []);
        resolve(files);
      });
      
      input.click();
    });
  }
}

/**
 * Open directory picker dialog
 */
export async function openDirectoryPicker(): Promise<File[]> {
  if (supportsFileSystemAccess()) {
    const dirHandle = await (window as any).showDirectoryPicker();
    const files: File[] = [];
    
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        if (file.type.startsWith('image/')) {
          files.push(file);
        }
      }
    }
    
    return files;
  } else {
    // Fallback: use webkitdirectory attribute
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      input.multiple = true;
      
      input.addEventListener('change', () => {
        const files = Array.from(input.files || []).filter(file => 
          file.type.startsWith('image/')
        );
        resolve(files);
      });
      
      input.click();
    });
  }
}

/**
 * Save file using File System Access API or fallback
 */
export async function saveFile(
  content: string | Blob,
  filename: string,
  mimeType = 'text/plain'
): Promise<void> {
  if (supportsFileSystemAccess() && typeof content === 'string') {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Text files',
          accept: { [mimeType]: ['.txt', '.yaml', '.yml'] },
        }],
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (error) {
      // User cancelled or API failed, fall back to download
    }
  }
  
  // Fallback to blob download
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType });
  
  saveAs(blob, filename);
}

/**
 * Export single image annotation as YOLO format
 */
export async function exportSingleImageYolo(
  image: ImageItem,
  bboxes: BBox[],
  classes: ClassDef[]
): Promise<void> {
  try {
    // Convert image to YOLO-compatible format
    const convertedImageBlob = await convertImageToYoloFormat(image);
    const targetFormat = getImageFormatFromImageItem(image);
    
    // Generate filename with appropriate extension
    const baseName = removeFileExtension(image.name);
    const imageFilename = `${baseName}.${targetFormat}`;
    const labelFilename = `${baseName}.txt`;
    
    // Generate YOLO annotation content
    const imageBboxes = bboxes.filter(bbox => bbox.imageId === image.id);
    const yoloContent = toYoloTxt(imageBboxes, image.width, image.height);
    
    // Create ZIP file with both image and label
    const zip = new JSZip();
    zip.file(imageFilename, convertedImageBlob);
    zip.file(labelFilename, yoloContent);
    
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseName}_yolo.zip`);
    
  } catch (error) {
    console.error('Error exporting single image:', error);
    throw error;
  }
}

/**
 * Export classes.txt file
 */
export async function exportClassesTxt(classes: ClassDef[]): Promise<void> {
  const content = generateClassesTxt(classes);
  await saveFile(content, 'classes.txt', 'text/plain');
}

/**
 * Export data.yaml file
 */
export async function exportDataYaml(classes: ClassDef[]): Promise<void> {
  const content = generateDataYaml(classes);
  await saveFile(content, 'data.yaml', 'text/yaml');
}

/**
 * Export complete YOLO dataset as ZIP file
 */
export async function exportDatasetZip(
  images: ImageItem[],
  bboxes: BBox[],
  classes: ClassDef[],
  options: ExportOptions,
  projectName: string
): Promise<void> {
  const zip = new JSZip();
  
  // Split dataset
  const split = splitDataset(images, options);
  
  // Create directory structure
  const createDirectories = (splitName: string) => {
    zip.folder(`images/${splitName}`);
    zip.folder(`labels/${splitName}`);
  };
  
  createDirectories('train');
  createDirectories('val');
  if (options.testSplit > 0) {
    createDirectories('test');
  }
  
  // Add images and labels for each split
  const addSplitFiles = async (splitImages: ImageItem[], splitName: string) => {
    for (const image of splitImages) {
      try {
        // Convert image to YOLO-compatible format
        const convertedImageBlob = await convertImageToYoloFormat(image);
        const targetFormat = getImageFormatFromImageItem(image);
        
        // Generate appropriate filename
        const baseName = removeFileExtension(image.name);
        const imageFilename = `${baseName}.${targetFormat}`;
        const labelFilename = `${baseName}.txt`;
        
        // Add converted image file
        zip.file(`images/${splitName}/${imageFilename}`, convertedImageBlob);
        
        // Add label file
        const imageBboxes = bboxes.filter(bbox => bbox.imageId === image.id);
        const yoloContent = toYoloTxt(imageBboxes, image.width, image.height);
        zip.file(`labels/${splitName}/${labelFilename}`, yoloContent);
        
        console.log(`Added ${imageFilename} (converted from ${image.originalFormat || 'image'}) to ${splitName} split`);
      } catch (error) {
        console.warn(`Failed to add image ${image.name}:`, error);
      }
    }
  };
  
  await addSplitFiles(split.train, 'train');
  await addSplitFiles(split.val, 'val');
  if (split.test.length > 0) {
    await addSplitFiles(split.test, 'test');
  }
  
  // Add classes.txt
  const classesContent = generateClassesTxt(classes);
  zip.file('classes.txt', classesContent);
  
  // Add data.yaml if requested
  if (options.includeDataYaml) {
    const dataYamlContent = generateDataYaml(classes, {
      includeTest: split.test.length > 0,
    });
    zip.file('data.yaml', dataYamlContent);
  }
  
  // Add README
  const readmeContent = generateDatasetReadme(projectName, images.length, classes, options);
  zip.file('README.md', readmeContent);
  
  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_dataset.zip`;
  saveAs(zipBlob, filename);
}

/**
 * Generate README.md for the dataset
 */
function generateDatasetReadme(
  projectName: string,
  totalImages: number,
  classes: ClassDef[],
  options: ExportOptions
): string {
  const lines: string[] = [];
  
  lines.push(`# ${projectName} - YOLO Dataset`);
  lines.push('');
  lines.push('This dataset was generated using YOLO Label Generator.');
  lines.push('');
  
  lines.push('## Dataset Information');
  lines.push('');
  lines.push(`- **Total Images**: ${totalImages}`);
  lines.push(`- **Number of Classes**: ${classes.length}`);
  lines.push(`- **Train Split**: ${options.trainSplit}%`);
  lines.push(`- **Validation Split**: ${options.valSplit}%`);
  lines.push(`- **Test Split**: ${options.testSplit}%`);
  lines.push(`- **Split Method**: ${options.splitMethod}`);
  lines.push('');
  
  lines.push('## Classes');
  lines.push('');
  classes.forEach(cls => {
    lines.push(`- **${cls.id}**: ${cls.name}`);
  });
  lines.push('');
  
  lines.push('## Directory Structure');
  lines.push('');
  lines.push('```');
  lines.push('dataset/');
  lines.push('├── images/');
  lines.push('│   ├── train/          # Training images');
  lines.push('│   ├── val/            # Validation images');
  if (options.testSplit > 0) {
    lines.push('│   └── test/           # Test images');
  }
  lines.push('├── labels/');
  lines.push('│   ├── train/          # Training labels (YOLO format)');
  lines.push('│   ├── val/            # Validation labels (YOLO format)');
  if (options.testSplit > 0) {
    lines.push('│   └── test/           # Test labels (YOLO format)');
  }
  lines.push('├── classes.txt         # Class names (one per line)');
  if (options.includeDataYaml) {
    lines.push('├── data.yaml           # YOLO training configuration');
  }
  lines.push('└── README.md           # This file');
  lines.push('```');
  lines.push('');
  
  lines.push('## YOLO Format');
  lines.push('');
  lines.push('Each annotation file contains one line per object:');
  lines.push('```');
  lines.push('<class_id> <x_center> <y_center> <width> <height>');
  lines.push('```');
  lines.push('');
  lines.push('Where:');
  lines.push('- `class_id`: Integer class ID (0-based)');
  lines.push('- `x_center, y_center`: Normalized center coordinates (0.0-1.0)');
  lines.push('- `width, height`: Normalized dimensions (0.0-1.0)');
  lines.push('');
  
  if (options.includeDataYaml) {
    lines.push('## Training with YOLO');
    lines.push('');
    lines.push('This dataset is ready to use with YOLOv5, YOLOv8, or other YOLO implementations:');
    lines.push('');
    lines.push('```bash');
    lines.push('# YOLOv8 example');
    lines.push('yolo train data=data.yaml model=yolov8n.pt epochs=100');
    lines.push('```');
    lines.push('');
  }
  
  lines.push('## Generated');
  lines.push('');
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push('Tool: YOLO Label Generator');
  
  return lines.join('\n');
}

/**
 * Import YOLO dataset from ZIP file
 */
export async function importDatasetZip(file: File): Promise<{
  images: File[];
  labels: Record<string, string>;
  classes: string[];
  dataYaml?: string;
}> {
  const zip = await JSZip.loadAsync(file);
  
  const images: File[] = [];
  const labels: Record<string, string> = {};
  let classes: string[] = [];
  let dataYaml: string | undefined;
  
  // Process all files in the ZIP
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const filename = path.split('/').pop()!;
    
    // Handle images
    if (path.includes('/images/') && !zipEntry.dir) {
      const blob = await zipEntry.async('blob');
      const file = new File([blob], filename, { type: getImageMimeType(filename) });
      images.push(file);
    }
    
    // Handle labels
    if (path.includes('/labels/') && filename.endsWith('.txt')) {
      const content = await zipEntry.async('text');
      const imageName = filename.replace('.txt', '');
      labels[imageName] = content;
    }
    
    // Handle classes.txt
    if (filename === 'classes.txt') {
      const content = await zipEntry.async('text');
      classes = content.split('\n').filter(line => line.trim());
    }
    
    // Handle data.yaml
    if (filename === 'data.yaml' || filename === 'data.yml') {
      dataYaml = await zipEntry.async('text');
    }
  }
  
  return { images, labels, classes, dataYaml };
}

/**
 * Get MIME type from image filename
 */
function getImageMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Export project backup
 */
export async function exportProjectBackup(
  projectName: string,
  projectData: any
): Promise<void> {
  const backupData = {
    version: '1.0',
    timestamp: Date.now(),
    project: projectData,
  };
  
  const content = JSON.stringify(backupData, null, 2);
  const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_backup.json`;
  
  await saveFile(content, filename, 'application/json');
}

/**
 * Import project backup
 */
export async function importProjectBackup(): Promise<any> {
  const files = await openFilePicker({
    multiple: false,
    accept: { 'application/json': ['.json'] },
  });
  
  if (files.length === 0) {
    throw new Error('No file selected');
  }
  
  const file = files[0];
  const content = await file.text();
  
  try {
    const backupData = JSON.parse(content);
    
    if (!backupData.project || !backupData.version) {
      throw new Error('Invalid backup file format');
    }
    
    return backupData.project;
  } catch (error) {
    throw new Error('Failed to parse backup file');
  }
}
