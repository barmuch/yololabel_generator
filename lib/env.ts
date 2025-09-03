import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required'),
  CLOUDINARY_URL: z.string().url('Invalid Cloudinary URL').optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Public Cloudinary cloud name is required'),
  
  // Optional Cloudinary unsigned preset for development
  CLOUDINARY_UNSIGNED_PRESET: z.string().optional(),
  
  // MongoDB Configuration
  MONGODB_URI: z.string().url('Invalid MongoDB URI'),
  
  // Development flags
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables
export const env = envSchema.parse(process.env);

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// Server-only validation (throws if invalid)
export function validateServerEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment configuration:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Client-safe environment (only NEXT_PUBLIC_ vars)
export const clientEnv = {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
} as const;
