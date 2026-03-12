import path from 'node:path';

const HIDDEN_SEGMENT_PATTERN = /^\./;
const PATH_EDGE_SLASH_PATTERN = /^\/+|\/+$/g;

export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function splitPathSegments(value: string): string[] {
  return normalizePath(value)
    .replace(PATH_EDGE_SLASH_PATTERN, '')
    .split('/')
    .filter(Boolean);
}

export function toOsPath(value: string): string {
  return path.normalize(value);
}

export function isHiddenPath(value: string): boolean {
  return splitPathSegments(value).some((segment) => HIDDEN_SEGMENT_PATTERN.test(segment));
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

export function getSourceFolderPathFromRelativePath(relativePath: string): string | null {
  const normalized = normalizePath(relativePath).replace(PATH_EDGE_SLASH_PATTERN, '');
  if (!normalized) {
    return null;
  }

  const sourceFolderPath = path.posix.dirname(normalized);
  return sourceFolderPath === '.' ? null : sourceFolderPath;
}

export function getLeafPathName(relativePath: string): string {
  const segments = splitPathSegments(relativePath);
  return segments.at(-1) ?? 'folder';
}

export function getPathBreadcrumb(relativePath: string): string | null {
  const segments = splitPathSegments(relativePath);
  if (segments.length <= 1) {
    return null;
  }

  return segments.slice(0, -1).join(' / ');
}

export function getFolderDisplayInfo(relativePath: string): { name: string; breadcrumb: string | null } {
  return {
    name: getLeafPathName(relativePath),
    breadcrumb: getPathBreadcrumb(relativePath)
  };
}
