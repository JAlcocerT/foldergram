import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(moduleDirectory, '../../..');

dotenv.config({ path: path.join(repositoryRoot, '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4173),
  DATA_ROOT: z.string().default('./data'),
  DATA_DIR: z.string().optional(),
  GALLERY_ROOT: z.string().optional(),
  DB_DIR: z.string().optional(),
  THUMBNAILS_DIR: z.string().optional(),
  PREVIEWS_DIR: z.string().optional(),
  SCAN_DISCOVERY_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  SCAN_DERIVATIVE_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

const parsed = envSchema.parse(process.env);

function resolveFromRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

function resolveConfiguredPath(value: string | null | undefined, fallbackAbsolutePath: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return resolveFromRoot(value);
  }

  return fallbackAbsolutePath;
}

const dataRoot = resolveConfiguredPath(parsed.DATA_ROOT ?? parsed.DATA_DIR, resolveFromRoot('./data'));
const galleryRoot = resolveConfiguredPath(parsed.GALLERY_ROOT, path.join(dataRoot, 'gallery'));
const dbDir = resolveConfiguredPath(parsed.DB_DIR, path.join(dataRoot, 'db'));
const thumbnailsDir = resolveConfiguredPath(parsed.THUMBNAILS_DIR, path.join(dataRoot, 'thumbnails'));
const previewsDir = resolveConfiguredPath(parsed.PREVIEWS_DIR, path.join(dataRoot, 'previews'));

export const appConfig = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  isDevelopment: parsed.NODE_ENV === 'development',
  dataRoot,
  galleryRoot,
  dbDir,
  thumbnailsDir,
  previewsDir,
  scanDiscoveryConcurrency: parsed.SCAN_DISCOVERY_CONCURRENCY,
  scanDerivativeConcurrency: parsed.SCAN_DERIVATIVE_CONCURRENCY,
  databasePath: path.join(dbDir, 'gallery.sqlite')
};
