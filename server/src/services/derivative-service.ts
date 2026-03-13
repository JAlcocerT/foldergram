import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import sharp from 'sharp';

import type { MediaType } from '../types/models.js';
import { appConfig } from '../config/env.js';
import { extractTakenAt, normalizeTakenAtValue } from '../utils/exif-utils.js';
import {
  PREVIEW_MAX_WIDTH,
  THUMBNAIL_SIZE,
  getMediaTypeFromExtension,
  getPreviewRelativePath,
  getThumbnailRelativePath
} from '../utils/image-utils.js';
import { safeJoin } from '../utils/path-utils.js';

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  tags?: {
    creation_time?: string;
  };
}

interface FfprobeFormat {
  duration?: string;
  tags?: {
    creation_time?: string;
  };
}

interface FfprobePayload {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export interface MediaMetadata {
  width: number;
  height: number;
  takenAt: number | null;
  durationMs: number | null;
  mediaType: MediaType;
}

export interface DerivativeResult extends MediaMetadata {
  thumbnailPath: string;
  previewPath: string;
  generatedThumbnail: boolean;
  generatedPreview: boolean;
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

async function runBinary(command: string, args: string[]): Promise<void> {
  await execFileAsync(command, args, {
    maxBuffer: 8 * 1024 * 1024
  });
}

async function readVideoProbe(sourcePath: string): Promise<FfprobePayload> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:format_tags=creation_time:stream=codec_type,width,height:stream_tags=creation_time',
      '-of',
      'json',
      sourcePath
    ],
    {
      maxBuffer: 2 * 1024 * 1024
    }
  );

  return JSON.parse(stdout) as FfprobePayload;
}

async function readImageMetadata(sourcePath: string): Promise<MediaMetadata> {
  const [metadata, takenAt] = await Promise.all([
    sharp(sourcePath, { animated: false }).metadata(),
    extractTakenAt(sourcePath)
  ]);

  return {
    width: metadata.width ?? THUMBNAIL_SIZE,
    height: metadata.height ?? THUMBNAIL_SIZE,
    takenAt,
    durationMs: null,
    mediaType: 'image'
  };
}

async function readVideoMetadata(sourcePath: string): Promise<MediaMetadata> {
  const payload = await readVideoProbe(sourcePath);
  const videoStream = payload.streams?.find((stream) => stream.codec_type === 'video');
  const durationSeconds = payload.format?.duration ? Number.parseFloat(payload.format.duration) : Number.NaN;
  const durationMs = Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 1000) : null;
  const takenAt = normalizeTakenAtValue(videoStream?.tags?.creation_time ?? payload.format?.tags?.creation_time ?? null);

  return {
    width: videoStream?.width ?? THUMBNAIL_SIZE,
    height: videoStream?.height ?? THUMBNAIL_SIZE,
    takenAt,
    durationMs,
    mediaType: 'video'
  };
}

export async function readMediaMetadata(sourcePath: string, mediaType: MediaType): Promise<MediaMetadata> {
  return mediaType === 'video' ? readVideoMetadata(sourcePath) : readImageMetadata(sourcePath);
}

async function generateImageDerivatives(
  sourcePath: string,
  thumbnailAbsolutePath: string,
  previewAbsolutePath: string,
  force: boolean
): Promise<Pick<DerivativeResult, 'generatedThumbnail' | 'generatedPreview'>> {
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
    generatedThumbnail: shouldWriteThumbnail,
    generatedPreview: shouldWritePreview
  };
}

async function generateVideoDerivatives(
  sourcePath: string,
  thumbnailAbsolutePath: string,
  previewAbsolutePath: string,
  force: boolean
): Promise<Pick<DerivativeResult, 'generatedThumbnail' | 'generatedPreview'>> {
  const shouldWriteThumbnail = force || !(await fileExists(thumbnailAbsolutePath));
  const shouldWritePreview = force || !(await fileExists(previewAbsolutePath));

  if (shouldWriteThumbnail) {
    await ensureParentDirectory(thumbnailAbsolutePath);
    await runBinary('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      sourcePath,
      '-vf',
      `thumbnail,scale=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:force_original_aspect_ratio=increase,crop=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}`,
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '82',
      '-compression_level',
      '4',
      thumbnailAbsolutePath
    ]);
  }

  if (shouldWritePreview) {
    await ensureParentDirectory(previewAbsolutePath);
    await runBinary('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      sourcePath,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      `scale='min(${PREVIEW_MAX_WIDTH},iw)':-2:flags=lanczos`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '24',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      previewAbsolutePath
    ]);
  }

  return {
    generatedThumbnail: shouldWriteThumbnail,
    generatedPreview: shouldWritePreview
  };
}

export async function generateDerivatives(sourcePath: string, relativePath: string, force = false): Promise<DerivativeResult> {
  const mediaType = getMediaTypeFromExtension(path.extname(relativePath));
  const thumbnailPath = getThumbnailRelativePath(relativePath);
  const previewPath = getPreviewRelativePath(relativePath, mediaType);
  const thumbnailAbsolutePath = safeJoin(appConfig.thumbnailsDir, thumbnailPath);
  const previewAbsolutePath = safeJoin(appConfig.previewsDir, previewPath);
  const metadata = await readMediaMetadata(sourcePath, mediaType);
  const generated =
    mediaType === 'video'
      ? await generateVideoDerivatives(sourcePath, thumbnailAbsolutePath, previewAbsolutePath, force)
      : await generateImageDerivatives(sourcePath, thumbnailAbsolutePath, previewAbsolutePath, force);

  return {
    ...metadata,
    thumbnailPath,
    previewPath,
    generatedThumbnail: generated.generatedThumbnail,
    generatedPreview: generated.generatedPreview
  };
}
