import { ImageItem, ExportOptions } from './types';

export interface DatasetSplit {
  train: ImageItem[];
  val: ImageItem[];
  test: ImageItem[];
}

/**
 * Split images into train/validation/test sets
 */
export function splitDataset(
  images: ImageItem[],
  options: ExportOptions
): DatasetSplit {
  const { trainSplit, valSplit, testSplit, splitMethod } = options;
  
  // Validate split percentages
  const total = trainSplit + valSplit + testSplit;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error('Split percentages must sum to 100%');
  }
  
  const totalImages = images.length;
  if (totalImages === 0) {
    return { train: [], val: [], test: [] };
  }
  
  // Calculate number of images for each split
  const trainCount = Math.round((trainSplit / 100) * totalImages);
  const valCount = Math.round((valSplit / 100) * totalImages);
  const testCount = totalImages - trainCount - valCount; // Remaining images go to test
  
  const shuffledImages = [...images];
  
  if (splitMethod === 'random') {
    // Shuffle array using Fisher-Yates algorithm
    for (let i = shuffledImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }
  }
  // For 'sequential' method, we keep the original order
  
  const train = shuffledImages.slice(0, trainCount);
  const val = shuffledImages.slice(trainCount, trainCount + valCount);
  const test = shuffledImages.slice(trainCount + valCount);
  
  return { train, val, test };
}

/**
 * Validate split configuration
 */
export function validateSplitOptions(options: ExportOptions): string[] {
  const errors: string[] = [];
  const { trainSplit, valSplit, testSplit } = options;
  
  // Check if all splits are non-negative
  if (trainSplit < 0) errors.push('Train split cannot be negative');
  if (valSplit < 0) errors.push('Validation split cannot be negative');
  if (testSplit < 0) errors.push('Test split cannot be negative');
  
  // Check if all splits are not greater than 100
  if (trainSplit > 100) errors.push('Train split cannot exceed 100%');
  if (valSplit > 100) errors.push('Validation split cannot exceed 100%');
  if (testSplit > 100) errors.push('Test split cannot exceed 100%');
  
  // Check if sum equals 100
  const total = trainSplit + valSplit + testSplit;
  if (Math.abs(total - 100) > 0.01) {
    errors.push(`Split percentages must sum to 100% (current: ${total.toFixed(1)}%)`);
  }
  
  // Check minimum requirements
  if (trainSplit < 10) errors.push('Train split should be at least 10%');
  if (valSplit > 0 && valSplit < 5) errors.push('Validation split should be at least 5% if used');
  if (testSplit > 0 && testSplit < 5) errors.push('Test split should be at least 5% if used');
  
  return errors;
}

/**
 * Calculate optimal split based on dataset size
 */
export function calculateOptimalSplit(imageCount: number): ExportOptions {
  let trainSplit: number;
  let valSplit: number;
  let testSplit: number;
  
  if (imageCount < 10) {
    // Very small dataset - use all for training
    trainSplit = 100;
    valSplit = 0;
    testSplit = 0;
  } else if (imageCount < 100) {
    // Small dataset - 80/20 split
    trainSplit = 80;
    valSplit = 20;
    testSplit = 0;
  } else if (imageCount < 1000) {
    // Medium dataset - 70/20/10 split
    trainSplit = 70;
    valSplit = 20;
    testSplit = 10;
  } else {
    // Large dataset - 70/15/15 split
    trainSplit = 70;
    valSplit = 15;
    testSplit = 15;
  }
  
  return {
    includeDataYaml: true,
    trainSplit,
    valSplit,
    testSplit,
    splitMethod: 'random',
  };
}

/**
 * Get split statistics
 */
export function getSplitStatistics(
  images: ImageItem[],
  split: DatasetSplit
): {
  totalImages: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  trainPercentage: number;
  valPercentage: number;
  testPercentage: number;
  labeledImages: number;
  unlabeledImages: number;
} {
  const totalImages = images.length;
  const trainCount = split.train.length;
  const valCount = split.val.length;
  const testCount = split.test.length;
  
  const trainPercentage = totalImages > 0 ? (trainCount / totalImages) * 100 : 0;
  const valPercentage = totalImages > 0 ? (valCount / totalImages) * 100 : 0;
  const testPercentage = totalImages > 0 ? (testCount / totalImages) * 100 : 0;
  
  const labeledImages = images.filter(img => img.status === 'labeled').length;
  const unlabeledImages = totalImages - labeledImages;
  
  return {
    totalImages,
    trainCount,
    valCount,
    testCount,
    trainPercentage,
    valPercentage,
    testPercentage,
    labeledImages,
    unlabeledImages,
  };
}

/**
 * Generate balanced split (ensure each class is represented in each split)
 */
export function generateBalancedSplit(
  images: ImageItem[],
  getBBoxesForImage: (imageId: string) => Array<{ classId: number }>,
  options: ExportOptions
): DatasetSplit {
  // Group images by their classes
  const imagesByClass = new Map<number, ImageItem[]>();
  
  images.forEach(image => {
    const bboxes = getBBoxesForImage(image.id);
    const classes = new Set(bboxes.map(bbox => bbox.classId));
    
    if (classes.size === 0) {
      // Image has no annotations - add to a special "unlabeled" group
      if (!imagesByClass.has(-1)) {
        imagesByClass.set(-1, []);
      }
      imagesByClass.get(-1)!.push(image);
    } else {
      // Add image to each class it contains
      classes.forEach(classId => {
        if (!imagesByClass.has(classId)) {
          imagesByClass.set(classId, []);
        }
        imagesByClass.get(classId)!.push(image);
      });
    }
  });
  
  const allSplits: DatasetSplit = { train: [], val: [], test: [] };
  
  // Split each class separately
  imagesByClass.forEach((classImages, classId) => {
    const classSplit = splitDataset(classImages, options);
    
    // Merge into final split (avoiding duplicates)
    const addUniqueImages = (target: ImageItem[], source: ImageItem[]) => {
      source.forEach(img => {
        if (!target.find(existing => existing.id === img.id)) {
          target.push(img);
        }
      });
    };
    
    addUniqueImages(allSplits.train, classSplit.train);
    addUniqueImages(allSplits.val, classSplit.val);
    addUniqueImages(allSplits.test, classSplit.test);
  });
  
  return allSplits;
}

/**
 * Ensure minimum examples per split
 */
export function ensureMinimumExamples(
  split: DatasetSplit,
  minTrainExamples = 1,
  minValExamples = 0,
  minTestExamples = 0
): DatasetSplit {
  const totalImages = split.train.length + split.val.length + split.test.length;
  
  if (totalImages < minTrainExamples + minValExamples + minTestExamples) {
    throw new Error('Not enough images to satisfy minimum requirements');
  }
  
  const result: DatasetSplit = { train: [...split.train], val: [...split.val], test: [...split.test] };
  
  // Move images from largest splits to satisfy minimums
  if (result.train.length < minTrainExamples) {
    const needed = minTrainExamples - result.train.length;
    if (result.val.length > minValExamples) {
      const available = Math.min(needed, result.val.length - minValExamples);
      result.train.push(...result.val.splice(0, available));
    }
    if (result.train.length < minTrainExamples && result.test.length > minTestExamples) {
      const stillNeeded = minTrainExamples - result.train.length;
      const available = Math.min(stillNeeded, result.test.length - minTestExamples);
      result.train.push(...result.test.splice(0, available));
    }
  }
  
  if (result.val.length < minValExamples) {
    const needed = minValExamples - result.val.length;
    if (result.test.length > minTestExamples) {
      const available = Math.min(needed, result.test.length - minTestExamples);
      result.val.push(...result.test.splice(0, available));
    }
  }
  
  return result;
}
