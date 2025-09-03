import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Custom ObjectId validator
const objectIdSchema = z.custom<ObjectId>(
  (val) => ObjectId.isValid(val),
  'Invalid ObjectId'
);

// Image upload validation
export const imageUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File must be smaller than 10MB')
    .refine((file) => file.type.startsWith('image/'), 'File must be an image'),
});

// Image metadata validation
export const imageMetadataSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  public_id: z.string().min(1, 'Public ID is required'),
  secure_url: z.string().url('Invalid secure URL'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.string().optional(),
  bytes: z.number().int().positive().optional(),
  originalName: z.string().optional(),
});

// Update image metadata schema
export const updateImageMetadataSchema = z.object({
  id: objectIdSchema,
  annotations: z.array(z.any()), // Accept any annotation format for now
});

// Update image metadata by public_id schema
export const updateImageByPublicIdSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  public_id: z.string().min(1, 'Public ID is required'),
  annotations: z.array(z.any()), // Accept any annotation format for now
});

// Project validation
export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  createdAt: z.number(),
  updatedAt: z.number(),
  images: z.array(z.any()).default([]),
  bboxes: z.array(z.any()).default([]),
  classes: z.array(z.any()).default([]),
});

// Query parameters validation
export const projectQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

// Export options validation
export const exportOptionsSchema = z.object({
  trainSplit: z.number().min(0).max(100),
  valSplit: z.number().min(0).max(100),
  testSplit: z.number().min(0).max(100),
  splitMethod: z.enum(['random', 'sequential']),
  includeDataYaml: z.boolean(),
}).refine(
  (data) => Math.abs(data.trainSplit + data.valSplit + data.testSplit - 100) < 0.01,
  'Split percentages must sum to 100%'
);

// Common error response
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  timestamp: z.string().optional(),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
export type UpdateImageMetadata = z.infer<typeof updateImageMetadataSchema>;
