import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type ContentManagementModule = typeof import('../src/services/content-management-service.js');
type AppConfigModule = typeof import('../src/config/env.js');

describe.sequential('content management', () => {
  let tempRoot = '';
  let appConfig: AppConfigModule['appConfig'];
  let service: ContentManagementModule['contentManagementService'];

  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'foldergram-content-management-'));
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATA_ROOT', path.join(tempRoot, 'data'));
    vi.stubEnv('GALLERY_ROOT', path.join(tempRoot, 'gallery'));
    vi.stubEnv('DB_DIR', path.join(tempRoot, 'db'));
    vi.stubEnv('THUMBNAILS_DIR', path.join(tempRoot, 'thumbnails'));
    vi.stubEnv('PREVIEWS_DIR', path.join(tempRoot, 'previews'));
    vi.resetModules();

    ({ appConfig } = await import('../src/config/env.js'));
    ({ contentManagementService: service } = await import('../src/services/content-management-service.js'));
  });

  beforeEach(async () => {
    await fs.rm(appConfig.galleryRoot, { recursive: true, force: true });
    await fs.mkdir(appConfig.galleryRoot, { recursive: true });
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('creates nested galleries with Hugo-compatible frontmatter', async () => {
    const metadata = await service.createFolder({
      folderPath: 'Knitting/Baby sets',
      title: 'Baby sets',
      description: 'Handmade clothes'
    });

    expect(metadata).toMatchObject({
      folderPath: 'Knitting/Baby sets',
      title: 'Baby sets',
      description: 'Handmade clothes',
      metadataFilename: 'index.md',
      media: []
    });

    const source = await fs.readFile(path.join(appConfig.galleryRoot, 'Knitting/Baby sets/index.md'), 'utf8');
    expect(source).toContain('title: Baby sets');
    expect(source).toContain('description: Handmade clothes');

    await expect(service.listFolders()).resolves.toContainEqual({
      folderPath: 'Knitting/Baby sets',
      title: 'Baby sets',
      mediaCount: 0
    });
  });

  it('updates captions while preserving other frontmatter and body content', async () => {
    const folder = path.join(appConfig.galleryRoot, 'Mantas');
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, 'manta.jpg'), 'image');
    await fs.writeFile(
      path.join(folder, 'index.md'),
      `---
title: Old title
date: 2025-02-25
keywords: [Punto]
resources:
  - src: manta.jpg
    title: Old caption
    params:
      featured: true
---
Existing body text.
`
    );

    const metadata = await service.updateMetadata({
      folderPath: 'Mantas',
      title: 'Mantas nuevas',
      description: 'Una colección',
      captions: [{ filename: 'manta.jpg', title: 'Manta para bebé' }]
    });

    expect(metadata.media).toEqual([{ filename: 'manta.jpg', caption: 'Manta para bebé' }]);
    const source = await fs.readFile(path.join(folder, 'index.md'), 'utf8');
    expect(source).toContain('date: 2025-02-25');
    expect(source).toContain('keywords: [ Punto ]');
    expect(source).toContain('featured: true');
    expect(source).toContain('Existing body text.');
  });

  it('uploads multiple supported files and rejects collisions', async () => {
    const folder = path.join(appConfig.galleryRoot, 'Uploads');
    const temporary = path.join(tempRoot, 'temporary');
    await fs.mkdir(folder);
    await fs.mkdir(temporary, { recursive: true });
    const first = path.join(temporary, 'first');
    const second = path.join(temporary, 'second');
    await fs.writeFile(first, 'one');
    await fs.writeFile(second, 'two');

    await expect(
      service.uploadFiles('Uploads', [
        { originalname: 'photo one.jpg', path: first },
        { originalname: 'photo-two.png', path: second }
      ])
    ).resolves.toEqual(['photo one.jpg', 'photo-two.png']);

    const collision = path.join(temporary, 'collision');
    await fs.writeFile(collision, 'duplicate');
    await expect(
      service.uploadFiles('Uploads', [{ originalname: 'PHOTO ONE.JPG', path: collision }])
    ).rejects.toThrow(/already exists/i);
    await expect(fs.stat(collision)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects traversal, hidden folders, and unsupported uploads', async () => {
    await expect(
      service.createFolder({ folderPath: '../outside', title: '', description: '' })
    ).rejects.toThrow(/relative path/i);
    await expect(
      service.createFolder({ folderPath: '.hidden/album', title: '', description: '' })
    ).rejects.toThrow(/relative path/i);

    const folder = path.join(appConfig.galleryRoot, 'Safe');
    const temporary = path.join(tempRoot, 'unsafe-upload');
    await fs.mkdir(folder);
    await fs.writeFile(temporary, 'not media');
    await expect(
      service.uploadFiles('Safe', [{ originalname: 'notes.txt', path: temporary }])
    ).rejects.toThrow(/unsupported/i);
  });
});
