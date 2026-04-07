import fs from 'node:fs';
import path from 'node:path';

import { appConfig } from '../config/env.js';
import { normalizePath, safeJoin } from '../utils/path-utils.js';
import { log } from './log-service.js';

type CaptionSource = 'filename' | 'frontmatter';

interface ParsedFolderResourceMetadata {
  basename: string;
  title: string | null;
}

interface ParsedFolderMetadata {
  description: string | null;
  resources: ParsedFolderResourceMetadata[];
}

interface CachedFolderMetadata {
  mtimeMs: number;
  metadata: ParsedFolderMetadata | null;
}

interface ResourceAccumulator {
  src?: string;
  title?: string | null;
}

const FRONTMATTER_DELIMITER = '---';
const FRONTMATTER_FILENAMES = ['index.md', '_index.md'] as const;
const folderMetadataCache = new Map<string, CachedFolderMetadata>();

function countLeadingSpaces(value: string): number {
  return value.length - value.trimStart().length;
}

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith('#');
}

function stripInlineComment(value: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\' && inDoubleQuote) {
      escaped = true;
      continue;
    }

    if (character === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (character === '#' && !inSingleQuote && !inDoubleQuote) {
      const previous = index === 0 ? ' ' : value[index - 1];
      if (/\s/.test(previous)) {
        return value.slice(0, index);
      }
    }
  }

  return value;
}

function parseScalarValue(rawValue: string): string | null {
  const withoutComment = stripInlineComment(rawValue).trim();

  if (withoutComment.length === 0 || withoutComment === '|' || withoutComment === '>') {
    return null;
  }

  if (withoutComment.startsWith('"') && withoutComment.endsWith('"') && withoutComment.length >= 2) {
    return withoutComment
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .trim() || null;
  }

  if (withoutComment.startsWith("'") && withoutComment.endsWith("'") && withoutComment.length >= 2) {
    return withoutComment.slice(1, -1).replace(/''/g, "'").trim() || null;
  }

  return withoutComment;
}

function parseFieldLine(line: string): { key: string; rawValue: string } | null {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex <= 0) {
    return null;
  }

  return {
    key: line.slice(0, separatorIndex).trim(),
    rawValue: line.slice(separatorIndex + 1)
  };
}

function parseResourceField(target: ResourceAccumulator, line: string): void {
  const field = parseFieldLine(line);
  if (!field) {
    return;
  }

  const value = parseScalarValue(field.rawValue);

  if (field.key === 'src' && value) {
    target.src = value;
    return;
  }

  if (field.key === 'title') {
    target.title = value;
  }
}

function normalizeResource(item: ResourceAccumulator): ParsedFolderResourceMetadata | null {
  if (!item.src) {
    return null;
  }

  return {
    basename: path.posix.basename(normalizePath(item.src)).toLowerCase(),
    title: item.title?.trim() || null
  };
}

function parseResources(lines: string[], startIndex: number): { resources: ParsedFolderResourceMetadata[]; nextIndex: number } {
  const resources: ParsedFolderResourceMetadata[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlankOrComment(line)) {
      index += 1;
      continue;
    }

    const indent = countLeadingSpaces(line);
    if (indent === 0) {
      break;
    }

    const trimmed = line.trimStart();
    if (!trimmed.startsWith('- ')) {
      index += 1;
      continue;
    }

    const resource: ResourceAccumulator = {};
    const inlineField = trimmed.slice(2).trim();
    if (inlineField.length > 0) {
      parseResourceField(resource, inlineField);
    }

    index += 1;

    while (index < lines.length) {
      const nestedLine = lines[index];

      if (isBlankOrComment(nestedLine)) {
        index += 1;
        continue;
      }

      const nestedIndent = countLeadingSpaces(nestedLine);
      if (nestedIndent <= indent) {
        break;
      }

      parseResourceField(resource, nestedLine.trimStart());
      index += 1;
    }

    const normalizedResource = normalizeResource(resource);
    if (normalizedResource) {
      resources.push(normalizedResource);
    }
  }

  return {
    resources,
    nextIndex: index
  };
}

function extractFrontmatter(source: string): string | null {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return null;
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER);
  if (endIndex === -1) {
    return null;
  }

  return lines.slice(1, endIndex).join('\n');
}

export function parseFolderFrontmatter(source: string): ParsedFolderMetadata | null {
  const frontmatter = extractFrontmatter(source);
  if (!frontmatter) {
    return null;
  }

  const lines = frontmatter.split('\n');
  let description: string | null = null;
  const resources: ParsedFolderResourceMetadata[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (isBlankOrComment(line) || countLeadingSpaces(line) !== 0) {
      index += 1;
      continue;
    }

    const field = parseFieldLine(line);
    if (!field) {
      index += 1;
      continue;
    }

    if (field.key === 'description') {
      description = parseScalarValue(field.rawValue);
      index += 1;
      continue;
    }

    if (field.key === 'resources') {
      const parsed = parseResources(lines, index + 1);
      resources.push(...parsed.resources);
      index = parsed.nextIndex;
      continue;
    }

    index += 1;
  }

  return {
    description,
    resources
  };
}

function resolveFolderMetadataFile(folderAbsolutePath: string): { filePath: string; mtimeMs: number } | null {
  for (const filename of FRONTMATTER_FILENAMES) {
    const candidatePath = path.join(folderAbsolutePath, filename);

    try {
      const stats = fs.statSync(candidatePath);
      if (stats.isFile()) {
        return {
          filePath: candidatePath,
          mtimeMs: stats.mtimeMs
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function readFolderMetadata(folderPath: string): ParsedFolderMetadata | null {
  const absoluteFolderPath = safeJoin(appConfig.galleryRoot, folderPath);
  const metadataFile = resolveFolderMetadataFile(absoluteFolderPath);
  if (!metadataFile) {
    return null;
  }

  const cached = folderMetadataCache.get(metadataFile.filePath);
  if (cached && cached.mtimeMs === metadataFile.mtimeMs) {
    return cached.metadata;
  }

  try {
    const source = fs.readFileSync(metadataFile.filePath, 'utf8');
    const metadata = parseFolderFrontmatter(source);

    folderMetadataCache.set(metadataFile.filePath, {
      mtimeMs: metadataFile.mtimeMs,
      metadata
    });

    return metadata;
  } catch (error) {
    folderMetadataCache.delete(metadataFile.filePath);
    log.info('Folder metadata ignored | unable to parse frontmatter', {
      folder: folderPath,
      file: path.basename(metadataFile.filePath),
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

export function formatFilenameCaption(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const folderMetadataService = {
  getImageDetailMetadata(folderPath: string, filename: string): {
    caption: string;
    captionSource: CaptionSource;
    folderDescription: string | null;
  } {
    const fallbackCaption = formatFilenameCaption(filename);
    const metadata = readFolderMetadata(folderPath);
    const normalizedFilename = path.posix.basename(normalizePath(filename)).toLowerCase();
    const importedCaption = metadata?.resources.find((resource) => resource.basename === normalizedFilename)?.title?.trim() || null;

    return {
      caption: importedCaption ?? fallbackCaption,
      captionSource: importedCaption ? 'frontmatter' : 'filename',
      folderDescription: metadata?.description?.trim() || null
    };
  }
};
