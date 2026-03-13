import express from 'express';
import { z } from 'zod';

import { galleryService } from '../services/gallery-service.js';
import { LIBRARY_REBUILD_REQUIRED_MESSAGE, scannerService } from '../services/scanner-service.js';
import { storageService } from '../services/storage-service.js';
import { watcherService } from '../services/watcher-service.js';

const router = express.Router();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24)
});
const mediaTypeQuerySchema = z.object({
  mediaType: z.enum(['image', 'video']).optional()
});
const deleteFolderQuerySchema = z.object({
  deleteSourceFolder: z.preprocess((value) => {
    if (value === undefined) {
      return false;
    }

    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  }, z.boolean())
});
const feedQuerySchema = paginationQuerySchema.extend({
  mode: z.enum(['recent', 'rediscover', 'random']).default('recent'),
  seed: z.coerce.number().int().nonnegative().optional()
});

const slugSchema = z.object({
  slug: z.string().min(1).max(240)
});
const momentIdSchema = z.object({
  id: z.string().min(1).max(120)
});

const imageIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

router.get('/health', (_request, response) => {
  const storageState = storageService.getState();
  response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    storage: {
      available: storageState.libraryAvailable,
      reason: storageState.reason,
      usingInMemoryDatabase: storageState.usingInMemoryDatabase
    }
  });
});

router.get('/feed', (request, response) => {
  const query = feedQuerySchema.parse(request.query);
  response.json(galleryService.getFeed(query.page, query.limit, query.mode, query.seed));
});

router.get('/feed/moments', (_request, response) => {
  response.json(galleryService.listMoments());
});

router.get('/feed/moments/:id', (request, response) => {
  const params = momentIdSchema.parse(request.params);
  const query = paginationQuerySchema.parse(request.query);
  const payload = galleryService.getMomentFeed(params.id, query.page, query.limit);

  if (!payload) {
    response.status(404).json({ message: 'Feed capsule not found' });
    return;
  }

  response.json(payload);
});

router.get('/folders', (_request, response) => {
  response.json({
    items: galleryService.listFolders()
  });
});

router.get('/folders/:slug', (request, response) => {
  const params = slugSchema.parse(request.params);
  const folder = galleryService.getFolderBySlug(params.slug);

  if (!folder) {
    response.status(404).json({ message: 'Folder not found' });
    return;
  }

  response.json(folder);
});

router.delete('/folders/:slug', async (request, response) => {
  const params = slugSchema.parse(request.params);
  const query = deleteFolderQuerySchema.parse(request.query);
  const deleted = await galleryService.deleteFolder(params.slug, {
    deleteSourceFolder: query.deleteSourceFolder
  });

  if (!deleted) {
    response.status(404).json({ message: 'Folder not found' });
    return;
  }

  response.json({
    ok: true,
    ...deleted
  });
});

router.get('/folders/:slug/images', (request, response) => {
  const params = slugSchema.parse(request.params);
  const query = paginationQuerySchema.merge(mediaTypeQuerySchema).parse(request.query);
  const payload = galleryService.getFolderImages(params.slug, query.page, query.limit, query.mediaType);

  if (!payload) {
    response.status(404).json({ message: 'Folder not found' });
    return;
  }

  response.json(payload);
});

router.get('/likes', (_request, response) => {
  response.json(galleryService.getLikes());
});

router.get('/images/:id', (request, response) => {
  const params = imageIdSchema.parse(request.params);
  const query = mediaTypeQuerySchema.parse(request.query);
  const image = galleryService.getImageDetail(params.id, query.mediaType);

  if (!image) {
    response.status(404).json({ message: 'Post not found' });
    return;
  }

  response.json(image);
});

router.post('/images/:id/like', (request, response) => {
  const params = imageIdSchema.parse(request.params);
  const payload = galleryService.likeImage(params.id);

  if (!payload) {
    response.status(404).json({ message: 'Image not found' });
    return;
  }

  response.json({
    ok: true,
    ...payload
  });
});

router.delete('/images/:id/like', (request, response) => {
  const params = imageIdSchema.parse(request.params);
  const payload = galleryService.unlikeImage(params.id);

  if (!payload) {
    response.status(404).json({ message: 'Image not found' });
    return;
  }

  response.json({
    ok: true,
    ...payload
  });
});

router.delete('/images/:id', async (request, response) => {
  const params = imageIdSchema.parse(request.params);
  const deleted = await galleryService.deleteImage(params.id);

  if (!deleted) {
    response.status(404).json({ message: 'Image not found' });
    return;
  }

  response.json({
    ok: true,
    ...deleted
  });
});

router.get('/originals/:id', (request, response) => {
  const params = imageIdSchema.parse(request.params);
  const originalPath = galleryService.getOriginalImagePath(params.id);

  if (!originalPath) {
    response.status(404).json({ message: 'Original media not found' });
    return;
  }

  response.sendFile(originalPath);
});

router.post('/admin/rescan', async (_request, response) => {
  try {
    if (scannerService.isLibraryRebuildRequired()) {
      response.status(409).json({
        message: LIBRARY_REBUILD_REQUIRED_MESSAGE
      });
      return;
    }

    const lastScan = await scannerService.scanAll('manual');
    await watcherService.start();
    response.json({
      ok: true,
      lastScan
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run a manual scan.';
    const status = /rebuild required/i.test(message) ? 409 : 500;
    response.status(status).json({ message });
  }
});

router.post('/admin/rebuild-index', async (_request, response) => {
  await watcherService.stop();

  try {
    const lastScan = await scannerService.rebuildLibraryIndex('rebuild');
    response.json({
      ok: true,
      lastScan
    });
  } finally {
    await watcherService.start();
  }
});

router.post('/admin/rebuild-thumbnails', async (_request, response) => {
  if (scannerService.isLibraryRebuildRequired()) {
    response.status(409).json({
      message: LIBRARY_REBUILD_REQUIRED_MESSAGE
    });
    return;
  }

  await watcherService.stop();

  try {
    const lastScan = await scannerService.rebuildThumbnails('rebuild-thumbnails');
    response.json({
      ok: true,
      lastScan
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to regenerate thumbnails.';
    const status = /rebuild required/i.test(message) ? 409 : 500;
    response.status(status).json({ message });
  } finally {
    await watcherService.start();
  }
});

router.get('/admin/stats', (_request, response) => {
  response.json(galleryService.getStats());
});

export { router as apiRouter };
