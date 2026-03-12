import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

import { getRelativePathWithinRoot, isSameOrWithinPath, normalizePath } from '../utils/path-utils.js';

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
  LOG_VERBOSE: z.string().optional(),
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

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

const dataRoot = resolveConfiguredPath(parsed.DATA_ROOT ?? parsed.DATA_DIR, resolveFromRoot('./data'));
const galleryRoot = resolveConfiguredPath(parsed.GALLERY_ROOT, path.join(dataRoot, 'gallery'));
const dbDir = resolveConfiguredPath(parsed.DB_DIR, path.join(dataRoot, 'db'));
const thumbnailsDir = resolveConfiguredPath(parsed.THUMBNAILS_DIR, path.join(dataRoot, 'thumbnails'));
const previewsDir = resolveConfiguredPath(parsed.PREVIEWS_DIR, path.join(dataRoot, 'previews'));
const logVerbose = typeof parsed.LOG_VERBOSE === 'string' && /^(1|true|yes|on)$/i.test(parsed.LOG_VERBOSE);

const derivativeDirectoriesOverlap =
  isSameOrWithinPath(thumbnailsDir, previewsDir) || isSameOrWithinPath(previewsDir, thumbnailsDir);

if (derivativeDirectoriesOverlap) {
  throw new Error('Invalid storage configuration: THUMBNAILS_DIR and PREVIEWS_DIR must point to separate non-overlapping directories.');
}

if (isSameOrWithinPath(thumbnailsDir, galleryRoot)) {
  throw new Error('Invalid storage configuration: THUMBNAILS_DIR cannot contain GALLERY_ROOT.');
}

if (isSameOrWithinPath(previewsDir, galleryRoot)) {
  throw new Error('Invalid storage configuration: PREVIEWS_DIR cannot contain GALLERY_ROOT.');
}

const managedGalleryRelativeIgnores = uniq(
  [dbDir, thumbnailsDir, previewsDir]
    .map((directoryPath) => getRelativePathWithinRoot(galleryRoot, directoryPath))
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => normalizePath(value))
);

export const appConfig = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  isDevelopment: parsed.NODE_ENV === 'development',
  dataRoot,
  galleryRoot,
  dbDir,
  thumbnailsDir,
  previewsDir,
  managedGalleryRelativeIgnores,
  logVerbose,
  scanDiscoveryConcurrency: parsed.SCAN_DISCOVERY_CONCURRENCY,
  scanDerivativeConcurrency: parsed.SCAN_DERIVATIVE_CONCURRENCY,
  databasePath: path.join(dbDir, 'gallery.sqlite')
};
