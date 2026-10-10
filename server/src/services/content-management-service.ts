import fs from 'node:fs/promises';
import path from 'node:path';

import { Document, parseDocument } from 'yaml';

import { appConfig } from '../config/env.js';
import { folderMetadataService, formatFilenameCaption } from './folder-metadata-service.js';
import { isSupportedMediaFile } from '../utils/image-utils.js';
import { isHiddenPath, normalizePath, safeJoin, splitPathSegments } from '../utils/path-utils.js';

const FRONTMATTER_DELIMITER = '---';
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/g;
const WINDOWS_DRIVE_PATTERN = /^[a-z]:/i;
const MAX_FOLDER_PATH_LENGTH = 500;
const MAX_FILENAME_LENGTH = 240;

interface FrontmatterFile {
  document: Document;
  body: string;
  filename: 'index.md' | '_index.md';
}

interface ResourceMetadata {
  src: string;
  title?: string;
  [key: string]: unknown;
}

export interface ManagedFolderMedia {
  filename: string;
  caption: string;
}

export interface ManagedFolderMetadata {
  folderPath: string;
  title: string;
  description: string;
  metadataFilename: 'index.md' | '_index.md';
  media: ManagedFolderMedia[];
}

export interface ManagedFolderSummary {
  folderPath: string;
  title: string;
  mediaCount: number;
}

export interface UploadedFileInput {
  originalname: string;
  path: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateFolderPath(folderPath: string): string {
  const normalized = normalizePath(folderPath).replace(/^\/+|\/+$/g, '').trim();
  const segments = splitPathSegments(normalized);

  if (
    !normalized ||
    normalized.length > MAX_FOLDER_PATH_LENGTH ||
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(folderPath) ||
    WINDOWS_DRIVE_PATTERN.test(normalized) ||
    segments.some((segment) => segment === '.' || segment === '..') ||
    isHiddenPath(normalized)
  ) {
    throw new Error('Folder path must be a non-hidden relative path inside the gallery root.');
  }

  return segments.join('/');
}

function resolveFolderPath(folderPath: string): { relativePath: string; absolutePath: string } {
  const relativePath = validateFolderPath(folderPath);
  return {
    relativePath,
    absolutePath: safeJoin(appConfig.galleryRoot, relativePath)
  };
}

async function assertDirectory(absolutePath: string): Promise<void> {
  let stats;
  try {
    stats = await fs.stat(absolutePath);
  } catch {
    throw new Error('Gallery folder not found.');
  }

  if (!stats.isDirectory()) {
    throw new Error('Gallery folder not found.');
  }
}

function splitFrontmatter(source: string): { frontmatter: string; body: string } | null {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return null;
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER);
  if (endIndex === -1) {
    throw new Error('Existing metadata has invalid YAML frontmatter.');
  }

  return {
    frontmatter: lines.slice(1, endIndex).join('\n'),
    body: lines.slice(endIndex + 1).join('\n')
  };
}

async function readFrontmatterFile(absoluteFolderPath: string): Promise<FrontmatterFile> {
  for (const filename of ['index.md', '_index.md'] as const) {
    const filePath = path.join(absoluteFolderPath, filename);
    try {
      const source = await fs.readFile(filePath, 'utf8');
      const parsed = splitFrontmatter(source);
      if (!parsed) {
        throw new Error(`Existing ${filename} does not start with YAML frontmatter.`);
      }

      const document = parseDocument(parsed.frontmatter);
      if (document.errors.length > 0) {
        throw new Error(`Existing ${filename} has invalid YAML frontmatter.`);
      }

      return { document, body: parsed.body, filename };
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException;
      if (fileError.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  return {
    document: new Document({}),
    body: '',
    filename: 'index.md'
  };
}

function getDocumentRecord(document: Document): Record<string, unknown> {
  return asRecord(document.toJS()) ?? {};
}

function getResources(document: Document): ResourceMetadata[] {
  const resources = getDocumentRecord(document).resources;
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources.flatMap((resource) => {
    const record = asRecord(resource);
    const src = asTrimmedString(record?.src);
    return record && src ? [{ ...record, src } as ResourceMetadata] : [];
  });
}

function resourceBasename(resource: ResourceMetadata): string {
  return path.posix.basename(normalizePath(resource.src)).toLocaleLowerCase();
}

async function listMedia(absoluteFolderPath: string, document: Document): Promise<ManagedFolderMedia[]> {
  const entries = await fs.readdir(absoluteFolderPath, { withFileTypes: true });
  const captionByFilename = new Map(
    getResources(document).map((resource) => [resourceBasename(resource), asTrimmedString(resource.title)])
  );

  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && isSupportedMediaFile(entry.name))
    .map((entry) => ({
      filename: entry.name,
      caption: captionByFilename.get(entry.name.toLocaleLowerCase()) || formatFilenameCaption(entry.name)
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename, undefined, { numeric: true, sensitivity: 'base' }));
}

function serializeFrontmatter(file: FrontmatterFile): string {
  const yaml = file.document.toString({ lineWidth: 0 }).trimEnd();
  const body = file.body.trim();
  return `${FRONTMATTER_DELIMITER}\n${yaml}\n${FRONTMATTER_DELIMITER}${body ? `\n${body}\n` : '\n'}`;
}

async function writeFrontmatterFile(absoluteFolderPath: string, file: FrontmatterFile): Promise<void> {
  const destination = path.join(absoluteFolderPath, file.filename);
  const temporary = path.join(absoluteFolderPath, `.${file.filename}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(temporary, serializeFrontmatter(file), 'utf8');
  await fs.rename(temporary, destination);
}

function cleanUploadFilename(originalname: string): string {
  const filename = path.posix
    .basename(normalizePath(originalname))
    .normalize('NFC')
    .replace(CONTROL_CHARACTER_PATTERN, '')
    .trim();

  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.startsWith('.') ||
    filename.length > MAX_FILENAME_LENGTH ||
    !isSupportedMediaFile(filename)
  ) {
    throw new Error(`Unsupported or invalid media filename: ${originalname}`);
  }

  return filename;
}

async function removeTemporaryFiles(files: UploadedFileInput[]): Promise<void> {
  await Promise.all(files.map((file) => fs.rm(file.path, { force: true }).catch(() => undefined)));
}

async function moveUploadedFile(source: string, destination: string): Promise<void> {
  const staging = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${process.pid}.${Date.now()}.uploading`
  );

  try {
    await fs.copyFile(source, staging);
    await fs.link(staging, destination);
    await fs.rm(staging, { force: true });
    await fs.rm(source, { force: true }).catch(() => undefined);
  } catch (error) {
    await fs.rm(staging, { force: true }).catch(() => undefined);
    throw error;
  }
}

export const contentManagementService = {
  async listFolders(): Promise<ManagedFolderSummary[]> {
    const results: ManagedFolderSummary[] = [];

    async function walk(absoluteDirectory: string, relativeDirectory: string): Promise<void> {
      const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
      const hasMetadata = entries.some(
        (entry) => entry.isFile() && (entry.name === 'index.md' || entry.name === '_index.md')
      );
      const mediaCount = entries.filter(
        (entry) => entry.isFile() && !entry.name.startsWith('.') && isSupportedMediaFile(entry.name)
      ).length;

      if (relativeDirectory && (hasMetadata || mediaCount > 0)) {
        let title = path.posix.basename(relativeDirectory);
        try {
          title = (await contentManagementService.getMetadata(relativeDirectory)).title;
        } catch {
          // Keep malformed legacy folders selectable so the UI can report the precise error.
        }
        results.push({ folderPath: relativeDirectory, title, mediaCount });
      }

      await Promise.all(
        entries
          .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
          .map((entry) => {
            const childRelativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
            return walk(path.join(absoluteDirectory, entry.name), childRelativePath);
          })
      );
    }

    await walk(appConfig.galleryRoot, '');
    return results.sort((left, right) =>
      left.folderPath.localeCompare(right.folderPath, undefined, { numeric: true, sensitivity: 'base' })
    );
  },

  async createFolder(input: { folderPath: string; title: string; description: string }): Promise<ManagedFolderMetadata> {
    const resolved = resolveFolderPath(input.folderPath);

    try {
      await fs.mkdir(resolved.absolutePath, { recursive: false });
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException;
      if (fileError.code === 'ENOENT') {
        await fs.mkdir(path.dirname(resolved.absolutePath), { recursive: true });
        await fs.mkdir(resolved.absolutePath);
      } else if (fileError.code === 'EEXIST') {
        throw new Error('A folder already exists at that path.');
      } else {
        throw error;
      }
    }

    await this.updateMetadata({
      folderPath: resolved.relativePath,
      title: input.title,
      description: input.description,
      captions: []
    });

    return this.getMetadata(resolved.relativePath);
  },

  async getMetadata(folderPath: string): Promise<ManagedFolderMetadata> {
    const resolved = resolveFolderPath(folderPath);
    await assertDirectory(resolved.absolutePath);
    const file = await readFrontmatterFile(resolved.absolutePath);
    const record = getDocumentRecord(file.document);

    return {
      folderPath: resolved.relativePath,
      title: asTrimmedString(record.title) || path.posix.basename(resolved.relativePath),
      description: asTrimmedString(record.description),
      metadataFilename: file.filename,
      media: await listMedia(resolved.absolutePath, file.document)
    };
  },

  async updateMetadata(input: {
    folderPath: string;
    title: string;
    description: string;
    captions: Array<{ filename: string; title: string }>;
  }): Promise<ManagedFolderMetadata> {
    const resolved = resolveFolderPath(input.folderPath);
    await assertDirectory(resolved.absolutePath);
    const file = await readFrontmatterFile(resolved.absolutePath);
    const media = await listMedia(resolved.absolutePath, file.document);
    const actualFilenames = new Map(media.map((item) => [item.filename.toLocaleLowerCase(), item.filename]));
    const submittedCaptions = new Map<string, string>();

    for (const caption of input.captions) {
      const actualFilename = actualFilenames.get(caption.filename.toLocaleLowerCase());
      if (!actualFilename) {
        throw new Error(`Cannot caption missing media file: ${caption.filename}`);
      }
      submittedCaptions.set(actualFilename.toLocaleLowerCase(), caption.title.trim());
    }

    const title = input.title.trim();
    if (title) {
      file.document.set('title', title);
    } else {
      file.document.delete('title');
    }

    const description = input.description.trim();
    if (description) {
      file.document.set('description', description);
    } else {
      file.document.delete('description');
    }

    const existingResources = getResources(file.document);
    const resourceIndex = new Map(existingResources.map((resource, index) => [resourceBasename(resource), index]));

    for (const [normalizedFilename, caption] of submittedCaptions) {
      const index = resourceIndex.get(normalizedFilename);
      if (index === undefined) {
        if (caption) {
          existingResources.push({
            src: actualFilenames.get(normalizedFilename) as string,
            title: caption
          });
        }
        continue;
      }

      if (caption) {
        existingResources[index].title = caption;
      } else {
        delete existingResources[index].title;
      }
    }

    if (existingResources.length > 0) {
      file.document.set('resources', existingResources);
    } else {
      file.document.delete('resources');
    }

    await writeFrontmatterFile(resolved.absolutePath, file);
    folderMetadataService.invalidateFolder(resolved.relativePath);
    return this.getMetadata(resolved.relativePath);
  },

  async uploadFiles(folderPath: string, files: UploadedFileInput[]): Promise<string[]> {
    if (files.length === 0) {
      throw new Error('Select at least one photo or video to upload.');
    }

    const resolved = resolveFolderPath(folderPath);
    await assertDirectory(resolved.absolutePath);

    try {
      const filenames = files.map((file) => cleanUploadFilename(file.originalname));
      const normalizedNames = filenames.map((filename) => filename.toLocaleLowerCase());
      if (new Set(normalizedNames).size !== normalizedNames.length) {
        throw new Error('The upload contains duplicate filenames.');
      }

      const existingNames = new Set(
        (await fs.readdir(resolved.absolutePath)).map((filename) => filename.toLocaleLowerCase())
      );
      const collision = filenames.find((filename) => existingNames.has(filename.toLocaleLowerCase()));
      if (collision) {
        throw new Error(`A file named ${collision} already exists in this folder.`);
      }

      const moved: string[] = [];
      try {
        for (let index = 0; index < files.length; index += 1) {
          const destination = path.join(resolved.absolutePath, filenames[index]);
          await moveUploadedFile(files[index].path, destination);
          moved.push(destination);
        }
      } catch (error) {
        await Promise.all(moved.map((destination) => fs.rm(destination, { force: true })));
        throw error;
      }

      return filenames;
    } finally {
      await removeTemporaryFiles(files);
    }
  }
};

export const contentManagementInternals = {
  validateFolderPath,
  splitFrontmatter,
  cleanUploadFilename
};
