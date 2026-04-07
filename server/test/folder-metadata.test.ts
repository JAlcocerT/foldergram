import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFingerprint,
  getMediaTypeFromExtension,
  getMimeTypeFromExtension,
  getPreviewRelativePath,
  getThumbnailRelativePath
} from '../src/utils/image-utils.js';

type AppConfigModule = typeof import('../src/config/env.js');
type GalleryServiceModule = typeof import('../src/services/gallery-service.js');
type RepositoriesModule = typeof import('../src/db/repositories.js');
type ModelsModule = typeof import('../src/types/models.js');

type ImageRecord = ModelsModule['ImageRecord'];

describe.sequential('folder metadata on image detail', () => {
  let tempRoot = '';
  let appConfig: AppConfigModule['appConfig'];
  let galleryService: GalleryServiceModule['galleryService'];
  let folderRepository: RepositoriesModule['folderRepository'];
  let imageRepository: RepositoriesModule['imageRepository'];
  let maintenanceRepository: RepositoriesModule['maintenanceRepository'];

  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'foldergram-folder-metadata-'));

    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATA_ROOT', path.join(tempRoot, 'data'));
    vi.stubEnv('GALLERY_ROOT', path.join(tempRoot, 'gallery'));
    vi.stubEnv('DB_DIR', path.join(tempRoot, 'db'));
    vi.stubEnv('THUMBNAILS_DIR', path.join(tempRoot, 'thumbnails'));
    vi.stubEnv('PREVIEWS_DIR', path.join(tempRoot, 'previews'));

    vi.resetModules();

    ({ appConfig } = await import('../src/config/env.js'));
    ({ galleryService } = await import('../src/services/gallery-service.js'));
    ({ folderRepository, imageRepository, maintenanceRepository } = await import('../src/db/repositories.js'));
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException;
      if (fileError.code !== 'EBUSY') {
        throw error;
      }
    }
  });

  beforeEach(async () => {
    maintenanceRepository.resetLibraryIndex();
    await Promise.all([
      fs.rm(appConfig.galleryRoot, { recursive: true, force: true }),
      fs.rm(appConfig.thumbnailsDir, { recursive: true, force: true }),
      fs.rm(appConfig.previewsDir, { recursive: true, force: true })
    ]);
    await Promise.all([
      fs.mkdir(appConfig.galleryRoot, { recursive: true }),
      fs.mkdir(appConfig.thumbnailsDir, { recursive: true }),
      fs.mkdir(appConfig.previewsDir, { recursive: true })
    ]);
  });

  it('returns an imported caption and folder description from index.md', async () => {
    const image = await createIndexedImage('mantas', 'manta1.jpeg', {
      metadataFilename: 'index.md',
      metadataSource: `---
title: Mantas
description: Mantas multi-proposito
resources:
  - src: manta1.jpeg
    title: Manta para bebe
---
`
    });

    const detail = galleryService.getImageDetail(image.id);

    expect(detail).toMatchObject({
      id: image.id,
      caption: 'Manta para bebe',
      captionSource: 'frontmatter',
      folderDescription: 'Mantas multi-proposito'
    });
  });

  it('falls back to the readable filename and still uses _index.md for folder description', async () => {
    const image = await createIndexedImage('recuerdos', 'photo-one.jpg', {
      metadataFilename: '_index.md',
      metadataSource: `---
description: Imported from underscore metadata
resources:
  - src: another-file.jpg
    title: Not this one
---
`
    });

    const detail = galleryService.getImageDetail(image.id);

    expect(detail).toMatchObject({
      id: image.id,
      caption: 'photo one',
      captionSource: 'filename',
      folderDescription: 'Imported from underscore metadata'
    });
  });

  it('matches frontmatter resources by normalized basename', async () => {
    const image = await createIndexedImage('album', 'photo-one.jpg', {
      metadataFilename: 'index.md',
      metadataSource: `---
resources:
  - src: nested/PHOTO-ONE.JPG
    title: Matched from resource metadata
---
`
    });

    const detail = galleryService.getImageDetail(image.id);

    expect(detail).toMatchObject({
      id: image.id,
      caption: 'Matched from resource metadata',
      captionSource: 'frontmatter',
      folderDescription: null
    });
  });

  it('keeps image detail working when frontmatter is invalid', async () => {
    const image = await createIndexedImage('broken', 'photo-two.jpg', {
      metadataFilename: 'index.md',
      metadataSource: `---
description: Broken file without closing delimiter
`
    });

    const detail = galleryService.getImageDetail(image.id);

    expect(detail).toMatchObject({
      id: image.id,
      caption: 'photo two',
      captionSource: 'filename',
      folderDescription: null
    });
  });

  async function createIndexedImage(
    relativeFolderPath: string,
    filename: string,
    metadata?: { metadataFilename: 'index.md' | '_index.md'; metadataSource: string }
  ): Promise<ImageRecord> {
    const folder = folderRepository.upsert({
      slug: relativeFolderPath.replaceAll('/', '-'),
      name: path.posix.basename(relativeFolderPath),
      folderPath: relativeFolderPath
    });
    const relativePath = `${relativeFolderPath}/${filename}`;
    const absolutePath = path.join(appConfig.galleryRoot, relativePath);
    const extension = path.extname(filename).toLowerCase();
    const mediaType = getMediaTypeFromExtension(extension);
    const thumbnailRelativePath = getThumbnailRelativePath(relativePath);
    const previewRelativePath = getPreviewRelativePath(relativePath, mediaType);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `source:${relativePath}`);

    if (metadata) {
      await fs.writeFile(path.join(appConfig.galleryRoot, relativeFolderPath, metadata.metadataFilename), metadata.metadataSource);
    }

    const fileSize = Buffer.byteLength(`source:${relativePath}`);
    const mtimeMs = 1_700_000_000_000;

    return imageRepository.upsert({
      folderId: folder.id,
      filename,
      extension,
      relativePath,
      absolutePath,
      fileSize,
      width: 1200,
      height: 800,
      mediaType,
      mimeType: getMimeTypeFromExtension(extension),
      durationMs: mediaType === 'video' ? 12_000 : null,
      fingerprint: createFingerprint(relativePath, fileSize, mtimeMs),
      mtimeMs,
      firstSeenAt: '2026-03-01T00:00:00.000Z',
      sortTimestamp: mtimeMs,
      takenAt: mtimeMs,
      takenAtSource: 'mtime',
      thumbnailPath: thumbnailRelativePath,
      previewPath: previewRelativePath
    });
  }
});
