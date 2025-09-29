import { z } from 'zod';
import crypto from 'crypto';

// Environment validation schema (AUTH_SECRET & BOOTSTRAP_SECRET optional for local dev)
const envSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_UNSIGNED_PRESET: z.string().optional(),
  MONGODB_URI: z.string().url(),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters').optional(),
  BOOTSTRAP_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Attempt to autofix minimal dev defaults
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      if (!process.env.AUTH_SECRET) {
        process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
        // Only warn in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Generated temporary AUTH_SECRET for development. Set a persistent one in .env.local');
        }
      }
      if (!process.env.BOOTSTRAP_SECRET) {
        process.env.BOOTSTRAP_SECRET = 'bootstrap-once-secret';
        // Only warn in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Using default BOOTSTRAP_SECRET. Override in .env.local');
        }
      }
      if (!process.env.NEXTAUTH_URL) {
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
      }
      const retry = envSchema.safeParse(process.env);
      if (retry.success) {
        cachedEnv = retry.data;
        return cachedEnv;
      }
    }
    console.error('❌ Invalid environment configuration:');
    parsed.error.errors.forEach(err => console.error(`  - ${err.path.join('.')}: ${err.message}`));
    throw parsed.error;
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

// Backwards compatibility for old validateServerEnv usage
export function validateServerEnv(): Env { return getEnv(); }

export const clientEnv = {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
} as const;
