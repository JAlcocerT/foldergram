import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { appConfig } from '../config/env.js';
import { PREVIEW_MAX_WIDTH, THUMBNAIL_SIZE, getDerivativeRelativePath } from '../utils/image-utils.js';
import { safeJoin } from '../utils/path-utils.js';

export interface DerivativeResult {
  thumbnailPath: string;
  previewPath: string;
  width: number;
  height: number;
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function generateDerivatives(sourcePath: string, relativePath: string, force = false): Promise<DerivativeResult> {
  const derivativeRelativePath = getDerivativeRelativePath(relativePath);
  const thumbnailAbsolutePath = safeJoin(appConfig.thumbnailsDir, derivativeRelativePath);
  const previewAbsolutePath = safeJoin(appConfig.previewsDir, derivativeRelativePath);

  const metadata = await sharp(sourcePath, { animated: false }).metadata();
  const width = metadata.width ?? THUMBNAIL_SIZE;
  const height = metadata.height ?? THUMBNAIL_SIZE;

  const shouldWriteThumbnail = force || !(await fileExists(thumbnailAbsolutePath));
  const shouldWritePreview = force || !(await fileExists(previewAbsolutePath));

  if (shouldWriteThumbnail) {
    await ensureParentDirectory(thumbnailAbsolutePath);
    await sharp(sourcePath, { animated: false })
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'attention'
      })
      .webp({ quality: 82, effort: 4 })
      .toFile(thumbnailAbsolutePath);
  }

  if (shouldWritePreview) {
    await ensureParentDirectory(previewAbsolutePath);
    await sharp(sourcePath, { animated: false })
      .rotate()
      .resize({
        width: PREVIEW_MAX_WIDTH,
        withoutEnlargement: true
      })
      .webp({ quality: 86, effort: 4 })
      .toFile(previewAbsolutePath);
  }

  return {
    thumbnailPath: derivativeRelativePath,
    previewPath: derivativeRelativePath,
    width,
    height
  };
}
