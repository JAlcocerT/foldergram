import path from 'node:path';

const HIDDEN_SEGMENT_PATTERN = /^\./;

export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function toOsPath(value: string): string {
  return path.normalize(value);
}

export function isHiddenPath(value: string): boolean {
  return normalizePath(value)
    .split('/')
    .some((segment) => HIDDEN_SEGMENT_PATTERN.test(segment));
}

export function ensureWithinRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function safeJoin(root: string, relativePath: string): string {
  const targetPath = path.resolve(root, relativePath);
  if (!ensureWithinRoot(root, targetPath)) {
    throw new Error('Resolved path escapes configured root');
  }

  return targetPath;
}

export function getRelativeGalleryPath(galleryRoot: string, absolutePath: string): string {
  return normalizePath(path.relative(galleryRoot, absolutePath));
}

export function getFolderSlugFromRelativePath(relativePath: string): string | null {
  const [folderSlug] = normalizePath(relativePath).split('/');
  return folderSlug || null;
}
