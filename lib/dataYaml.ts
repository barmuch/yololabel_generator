import { ClassDef } from './types';

/**
 * Generate data.yaml file content for YOLO training
 */
export function generateDataYaml(
  classes: ClassDef[],
  options: {
    datasetPath?: string;
    trainPath?: string;
    valPath?: string;
    testPath?: string;
    includeTest?: boolean;
  } = {}
): string {
  const {
    datasetPath = '.',
    trainPath = 'images/train',
    valPath = 'images/val',
    testPath = 'images/test',
    includeTest = true,
  } = options;

  // Sort classes by ID to ensure consistent ordering
  const sortedClasses = [...classes].sort((a, b) => a.id - b.id);

  // Build the YAML content
  const lines: string[] = [];
  
  // Dataset path
  lines.push(`path: ${datasetPath}`);
  
  // Training and validation sets
  lines.push(`train: ${trainPath}`);
  lines.push(`val: ${valPath}`);
  
  // Test set (if included and has images)
  if (includeTest) {
    lines.push(`test: ${testPath}`);
  }
  
  lines.push('');
  
  // Class names
  lines.push('names:');
  sortedClasses.forEach(cls => {
    lines.push(`  ${cls.id}: ${cls.name}`);
  });

  return lines.join('\n');
}

/**
 * Generate data.yaml with additional metadata
 */
export function generateExtendedDataYaml(
  classes: ClassDef[],
  options: {
    datasetPath?: string;
    trainPath?: string;
    valPath?: string;
    testPath?: string;
    includeTest?: boolean;
    datasetName?: string;
    description?: string;
    version?: string;
    author?: string;
    license?: string;
    url?: string;
    downloadUrl?: string;
  } = {}
): string {
  const {
    datasetPath = '.',
    trainPath = 'images/train',
    valPath = 'images/val',
    testPath = 'images/test',
    includeTest = true,
    datasetName,
    description,
    version,
    author,
    license,
    url,
    downloadUrl,
  } = options;

  const lines: string[] = [];
  
  // Dataset metadata (if provided)
  if (datasetName) {
    lines.push(`# Dataset: ${datasetName}`);
  }
  if (description) {
    lines.push(`# Description: ${description}`);
  }
  if (author) {
    lines.push(`# Author: ${author}`);
  }
  if (version) {
    lines.push(`# Version: ${version}`);
  }
  if (license) {
    lines.push(`# License: ${license}`);
  }
  if (url) {
    lines.push(`# URL: ${url}`);
  }
  if (downloadUrl) {
    lines.push(`# Download: ${downloadUrl}`);
  }
  
  if (lines.length > 0) {
    lines.push('');
  }
  
  // Standard YOLO configuration
  lines.push(`path: ${datasetPath}`);
  lines.push(`train: ${trainPath}`);
  lines.push(`val: ${valPath}`);
  
  if (includeTest) {
    lines.push(`test: ${testPath}`);
  }
  
  lines.push('');
  
  // Number of classes
  lines.push(`nc: ${classes.length}`);
  
  // Class names
  lines.push('names:');
  const sortedClasses = [...classes].sort((a, b) => a.id - b.id);
  sortedClasses.forEach(cls => {
    lines.push(`  ${cls.id}: ${cls.name}`);
  });

  return lines.join('\n');
}

/**
 * Parse data.yaml content
 */
export function parseDataYaml(content: string): {
  path?: string;
  train?: string;
  val?: string;
  test?: string;
  nc?: number;
  names: Record<number, string>;
  metadata: Record<string, string>;
} {
  const lines = content.split('\n');
  const result: any = {
    names: {},
    metadata: {},
  };
  
  let inNamesSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      inNamesSection = false;
      continue;
    }
    
    // Parse comments as metadata
    if (trimmedLine.startsWith('#')) {
      const comment = trimmedLine.substring(1).trim();
      const colonIndex = comment.indexOf(':');
      if (colonIndex > 0) {
        const key = comment.substring(0, colonIndex).trim().toLowerCase();
        const value = comment.substring(colonIndex + 1).trim();
        result.metadata[key] = value;
      }
      continue;
    }
    
    // Parse names section
    if (trimmedLine === 'names:') {
      inNamesSection = true;
      continue;
    }
    
    if (inNamesSection && trimmedLine.startsWith(' ')) {
      // Parse class definition: "  0: person"
      const match = trimmedLine.match(/^\s*(\d+):\s*(.+)$/);
      if (match) {
        const classId = parseInt(match[1], 10);
        const className = match[2].trim();
        result.names[classId] = className;
      }
      continue;
    }
    
    // Parse other key-value pairs
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > 0) {
      inNamesSection = false;
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();
      
      switch (key) {
        case 'path':
        case 'train':
        case 'val':
        case 'test':
          result[key] = value;
          break;
        case 'nc':
          result[key] = parseInt(value, 10);
          break;
        default:
          result.metadata[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * Validate data.yaml structure
 */
export function validateDataYaml(yamlData: ReturnType<typeof parseDataYaml>): string[] {
  const errors: string[] = [];
  
  // Check required fields
  if (!yamlData.path) {
    errors.push('Missing required field: path');
  }
  
  if (!yamlData.train) {
    errors.push('Missing required field: train');
  }
  
  if (!yamlData.val) {
    errors.push('Missing required field: val');
  }
  
  // Check names
  if (Object.keys(yamlData.names).length === 0) {
    errors.push('No class names defined');
  }
  
  // Check class ID consistency
  const classIds = Object.keys(yamlData.names).map(id => parseInt(id, 10)).sort((a, b) => a - b);
  for (let i = 0; i < classIds.length; i++) {
    if (classIds[i] !== i) {
      errors.push(`Class IDs should be consecutive starting from 0. Missing class ID: ${i}`);
      break;
    }
  }
  
  // Check nc field consistency
  if (yamlData.nc !== undefined && yamlData.nc !== Object.keys(yamlData.names).length) {
    errors.push(`nc field (${yamlData.nc}) doesn't match number of classes (${Object.keys(yamlData.names).length})`);
  }
  
  return errors;
}

/**
 * Generate data.yaml template with common settings
 */
export function generateDataYamlTemplate(
  projectName: string,
  classes: string[]
): string {
  const classDefinitions = classes.map((name, index) => `  ${index}: ${name}`).join('\n');
  
  return `# YOLO Dataset Configuration
# Generated by YOLO Label Generator
# Project: ${projectName}
# Generated: ${new Date().toISOString()}

path: .  # dataset root dir
train: images/train  # train images (relative to 'path')
val: images/val  # val images (relative to 'path')
test: images/test  # test images (optional, relative to 'path')

# Classes
nc: ${classes.length}  # number of classes
names:
${classDefinitions}
`;
}

/**
 * Convert class definitions to data.yaml format
 */
export function classesToDataYaml(classes: ClassDef[]): string {
  return generateDataYaml(classes, {
    datasetPath: '.',
    trainPath: 'images/train',
    valPath: 'images/val',
    testPath: 'images/test',
    includeTest: true,
  });
}
