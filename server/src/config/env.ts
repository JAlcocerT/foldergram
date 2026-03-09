import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(moduleDirectory, '../../..');

dotenv.config({ path: path.join(repositoryRoot, '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4173),
  GALLERY_ROOT: z.string().default('./gallery'),
  DATA_DIR: z.string().default('./data'),
  THUMBNAILS_DIR: z.string().default('./thumbnails'),
  PREVIEWS_DIR: z.string().default('./previews'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

const parsed = envSchema.parse(process.env);

function resolveFromRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

export const appConfig = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  isDevelopment: parsed.NODE_ENV === 'development',
  galleryRoot: resolveFromRoot(parsed.GALLERY_ROOT),
  dataDir: resolveFromRoot(parsed.DATA_DIR),
  thumbnailsDir: resolveFromRoot(parsed.THUMBNAILS_DIR),
  previewsDir: resolveFromRoot(parsed.PREVIEWS_DIR),
  databasePath: path.join(resolveFromRoot(parsed.DATA_DIR), 'gallery.sqlite')
};

export function ensureRuntimeDirectories(): void {
  for (const directory of [
    appConfig.galleryRoot,
    appConfig.dataDir,
    appConfig.thumbnailsDir,
    appConfig.previewsDir
  ]) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }
}
