import path from 'node:path';

import { normalizePath } from './path-utils.js';

export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const THUMBNAIL_SIZE = 400;
export const PREVIEW_MAX_WIDTH = 1500;

export function isSupportedImageFile(filename: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export function createFingerprint(relativePath: string, fileSize: number, mtimeMs: number): string {
  return `${normalizePath(relativePath)}:${fileSize}:${Math.round(mtimeMs)}`;
}

export function getDerivativeRelativePath(relativePath: string): string {
  const normalized = normalizePath(relativePath);
  const extension = path.extname(normalized);
  return normalized.slice(0, normalized.length - extension.length) + '.webp';
}

export function getMimeTypeFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

export function getStableSortTimestamp(existing: { sortTimestamp?: number; firstSeenAt?: string } | null, mtimeMs: number): number {
  if (existing?.sortTimestamp) {
    return existing.sortTimestamp;
  }

  if (existing?.firstSeenAt) {
    return Date.parse(existing.firstSeenAt);
  }

  return Math.round(mtimeMs);
}
