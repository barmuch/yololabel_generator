import { BBox, YoloAnnotation } from './types';

/**
 * Convert bounding boxes to YOLO format text
 * YOLO format: <class_id> <x_center> <y_center> <width> <height>
 * All values normalized to 0-1 range relative to image dimensions
 */
export function toYoloTxt(bboxes: BBox[], imgWidth: number, imgHeight: number): string {
  if (!bboxes.length || imgWidth <= 0 || imgHeight <= 0) {
    return '';
  }

  const annotations = bboxes.map(bbox => {
    // Convert from top-left corner to center coordinates
    const xCenter = (bbox.x + bbox.w / 2) / imgWidth;
    const yCenter = (bbox.y + bbox.h / 2) / imgHeight;
    const width = bbox.w / imgWidth;
    const height = bbox.h / imgHeight;

    // Ensure values are in valid range [0, 1]
    const clampedXCenter = Math.max(0, Math.min(1, xCenter));
    const clampedYCenter = Math.max(0, Math.min(1, yCenter));
    const clampedWidth = Math.max(0, Math.min(1, width));
    const clampedHeight = Math.max(0, Math.min(1, height));

    return `${bbox.classId} ${clampedXCenter.toFixed(6)} ${clampedYCenter.toFixed(6)} ${clampedWidth.toFixed(6)} ${clampedHeight.toFixed(6)}`;
  });

  return annotations.join('\n');
}

/**
 * Parse YOLO format text back to annotations
 */
export function parseYoloTxt(content: string, imgWidth: number, imgHeight: number, imageId: string): BBox[] {
  if (!content.trim() || imgWidth <= 0 || imgHeight <= 0) {
    return [];
  }

  const lines = content.trim().split('\n');
  const bboxes: BBox[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length !== 5) {
      console.warn(`Invalid YOLO format at line ${i + 1}: expected 5 values, got ${parts.length}`);
      continue;
    }

    const [classIdStr, xCenterStr, yCenterStr, widthStr, heightStr] = parts;
    
    const classId = parseInt(classIdStr, 10);
    const xCenter = parseFloat(xCenterStr);
    const yCenter = parseFloat(yCenterStr);
    const width = parseFloat(widthStr);
    const height = parseFloat(heightStr);

    // Validate parsed values
    if (isNaN(classId) || isNaN(xCenter) || isNaN(yCenter) || isNaN(width) || isNaN(height)) {
      console.warn(`Invalid YOLO format at line ${i + 1}: non-numeric values`);
      continue;
    }

    if (classId < 0 || xCenter < 0 || xCenter > 1 || yCenter < 0 || yCenter > 1 || 
        width < 0 || width > 1 || height < 0 || height > 1) {
      console.warn(`Invalid YOLO format at line ${i + 1}: values out of range`);
      continue;
    }

    // Convert back to pixel coordinates
    const x = (xCenter - width / 2) * imgWidth;
    const y = (yCenter - height / 2) * imgHeight;
    const w = width * imgWidth;
    const h = height * imgHeight;

    bboxes.push({
      id: `bbox_${Date.now()}_${i}`,
      imageId,
      classId,
      x: Math.max(0, x),
      y: Math.max(0, y),
      w: Math.min(imgWidth - Math.max(0, x), w),
      h: Math.min(imgHeight - Math.max(0, y), h),
    });
  }

  return bboxes;
}

/**
 * Convert bounding box to YOLO annotation object
 */
export function bboxToYolo(bbox: BBox, imgWidth: number, imgHeight: number): YoloAnnotation {
  const xCenter = (bbox.x + bbox.w / 2) / imgWidth;
  const yCenter = (bbox.y + bbox.h / 2) / imgHeight;
  const width = bbox.w / imgWidth;
  const height = bbox.h / imgHeight;

  return {
    classId: bbox.classId,
    xCenter: Math.max(0, Math.min(1, xCenter)),
    yCenter: Math.max(0, Math.min(1, yCenter)),
    width: Math.max(0, Math.min(1, width)),
    height: Math.max(0, Math.min(1, height)),
  };
}

/**
 * Validate YOLO annotation data
 */
export function validateYoloAnnotation(annotation: YoloAnnotation): string[] {
  const errors: string[] = [];

  if (annotation.classId < 0) {
    errors.push('Class ID must be non-negative');
  }

  if (annotation.xCenter < 0 || annotation.xCenter > 1) {
    errors.push('X center must be between 0 and 1');
  }

  if (annotation.yCenter < 0 || annotation.yCenter > 1) {
    errors.push('Y center must be between 0 and 1');
  }

  if (annotation.width <= 0 || annotation.width > 1) {
    errors.push('Width must be between 0 and 1');
  }

  if (annotation.height <= 0 || annotation.height > 1) {
    errors.push('Height must be between 0 and 1');
  }

  // Check if bbox extends beyond image boundaries
  const left = annotation.xCenter - annotation.width / 2;
  const right = annotation.xCenter + annotation.width / 2;
  const top = annotation.yCenter - annotation.height / 2;
  const bottom = annotation.yCenter + annotation.height / 2;

  if (left < 0 || right > 1 || top < 0 || bottom > 1) {
    errors.push('Bounding box extends beyond image boundaries');
  }

  return errors;
}

/**
 * Generate classes.txt content from class definitions
 */
export function generateClassesTxt(classes: Array<{ id: number; name: string }>): string {
  // Sort by class ID to ensure consistent ordering
  const sortedClasses = [...classes].sort((a, b) => a.id - b.id);
  
  // Create array with proper indices (fill gaps with empty strings if needed)
  const maxId = Math.max(...sortedClasses.map(c => c.id), -1);
  const classNames = new Array(maxId + 1).fill('');
  
  sortedClasses.forEach(cls => {
    classNames[cls.id] = cls.name;
  });

  return classNames.join('\n');
}

/**
 * Parse classes.txt content to class definitions
 */
export function parseClassesTxt(content: string): Array<{ id: number; name: string }> {
  const lines = content.split('\n');
  const classes: Array<{ id: number; name: string }> = [];

  lines.forEach((line, index) => {
    const name = line.trim();
    if (name) {
      classes.push({ id: index, name });
    }
  });

  return classes;
}
