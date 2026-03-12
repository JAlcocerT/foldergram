import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import {
  LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY,
  LIBRARY_REBUILD_REQUIRED_SETTING_KEY,
  PREVIOUS_GALLERY_ROOT_SETTING_KEY
} from '../constants/app-setting-keys.js';
import { appConfig } from '../config/env.js';
import { appSettingsRepository, folderRepository, folderScanStateRepository, imageRepository, likeRepository, scanRunRepository } from '../db/repositories.js';
import type { FeedImage, ImageDetail, FolderSummaryRecord } from '../types/models.js';
import { scannerService } from './scanner-service.js';
import { storageService } from './storage-service.js';

function toPublicMediaUrl(basePath: '/thumbnails' | '/previews', relativePath: string): string {
  const encodedSegments = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${basePath}/${encodedSegments}`;
}

function buildOriginalUrl(id: number): string {
  return `/api/originals/${id}`;
}

function resolveWithinRoot(rootPath: string, targetPath: string): string | null {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(path.resolve(rootPath), resolved);

  if ((relative.startsWith('..') || path.isAbsolute(relative)) || relative === '') {
    return relative === '' ? resolved : null;
  }

  return resolved;
}

async function removeFileIfPresent(targetPath: string | null): Promise<void> {
  if (!targetPath) {
    return;
  }

  try {
    await fsPromises.unlink(targetPath);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError.code !== 'ENOENT') {
      throw error;
    }
  }
}

function mapFeedImage(image: FeedImage): FeedImage {
  return {
    ...image,
    thumbnailUrl: toPublicMediaUrl('/thumbnails', image.thumbnailUrl),
    previewUrl: toPublicMediaUrl('/previews', image.previewUrl)
  };
}

function mapImageDetail(image: ImageDetail): ImageDetail {
  return {
    ...image,
    thumbnailUrl: toPublicMediaUrl('/thumbnails', image.thumbnailUrl),
    previewUrl: toPublicMediaUrl('/previews', image.previewUrl),
    originalUrl: buildOriginalUrl(image.id)
  };
}

function buildFolderSummary(folder: FolderSummaryRecord) {
  const avatarImageId = folder.avatar_image_id ?? imageRepository.getLatestFolderImageId(folder.id);
  const avatar = avatarImageId ? imageRepository.getImageDetail(avatarImageId) : undefined;

  return {
    id: folder.id,
    slug: folder.slug,
    name: folder.name,
    folderPath: folder.folder_path,
    imageCount: folder.image_count,
    latestImageMtimeMs: folder.latest_image_mtime_ms,
    avatarUrl: avatar ? mapImageDetail(avatar).thumbnailUrl : null
  };
}

export const galleryService = {
  getFeed(page: number, limit: number) {
    if (!storageService.getState().libraryAvailable) {
      return {
        items: [],
        page,
        limit,
        total: 0,
        hasMore: false
      };
    }

    const total = imageRepository.countFeed();
    const items = imageRepository.listFeed(page, limit).map(mapFeedImage);

    return {
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total
    };
  },

  listFolders() {
    if (!storageService.getState().libraryAvailable) {
      return [];
    }

    return folderRepository.getAllSummaries().map(buildFolderSummary);
  },

  getFolderBySlug(slug: string) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const folder = folderRepository.getSummaryBySlug(slug);
    if (!folder) {
      return null;
    }

    return buildFolderSummary(folder);
  },

  getFolderImages(slug: string, page: number, limit: number) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const folder = folderRepository.getSummaryBySlug(slug);
    if (!folder) {
      return null;
    }

    const total = folder.image_count;

    return {
      folder: buildFolderSummary(folder),
      items: imageRepository.listFolderImages(folder.id, page, limit).map(mapFeedImage),
      page,
      limit,
      total,
      hasMore: page * limit < total
    };
  },

  getImageDetail(id: number) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const detail = imageRepository.getImageDetail(id);
    if (!detail) {
      return null;
    }

    return mapImageDetail(detail);
  },

  getLikes() {
    if (!storageService.getState().libraryAvailable) {
      return {
        items: []
      };
    }

    return {
      items: likeRepository.listLikedImages().map(mapFeedImage)
    };
  },

  likeImage(id: number) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const image = imageRepository.getById(id);
    if (!image || image.is_deleted) {
      return null;
    }

    likeRepository.upsert(id);

    return {
      id,
      liked: true
    };
  },

  unlikeImage(id: number) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const image = imageRepository.getById(id);
    if (!image || image.is_deleted) {
      return null;
    }

    likeRepository.remove(id);

    return {
      id,
      liked: false
    };
  },

  getStats() {
    const lastScan = scanRunRepository.latest();
    const storageState = storageService.getState();
    const currentGalleryRoot = appConfig.galleryRoot;
    const previousGalleryRoot = appSettingsRepository.get(PREVIOUS_GALLERY_ROOT_SETTING_KEY);
    const rebuildRequired = appSettingsRepository.get(LIBRARY_REBUILD_REQUIRED_SETTING_KEY) === '1';
    const lastSuccessfulGalleryRoot = appSettingsRepository.get(LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY);

    return {
      folders: storageState.libraryAvailable ? folderRepository.count() : 0,
      indexedImages: storageState.libraryAvailable ? imageRepository.countFeed() : 0,
      deletedImages: storageState.libraryAvailable ? imageRepository.countDeleted() : 0,
      thumbnailCount: storageState.libraryAvailable ? imageRepository.countWithThumbnail() : 0,
      previewCount: storageState.libraryAvailable ? imageRepository.countWithPreview() : 0,
      lastScan: lastScan ?? null,
      scan: scannerService.getProgress(),
      storage: {
        available: storageState.libraryAvailable,
        reason: storageState.reason,
        usingInMemoryDatabase: storageState.usingInMemoryDatabase
      },
      libraryIndex: {
        rebuildRequired,
        reason: rebuildRequired ? 'gallery_root_changed' : null,
        currentGalleryRoot,
        previousGalleryRoot,
        lastSuccessfulGalleryRoot
      }
    };
  },

  getOriginalImagePath(id: number): string | null {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const detail = imageRepository.getById(id);
    if (!detail || detail.is_deleted) {
      return null;
    }

    const resolved = resolveWithinRoot(appConfig.galleryRoot, detail.absolute_path);
    if (!resolved || !fs.existsSync(resolved)) {
      return null;
    }

    return resolved;
  },

  async deleteImage(id: number) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const imageRecord = imageRepository.getById(id);
    const imageDetail = imageRepository.getImageDetail(id);

    if (!imageRecord || !imageDetail) {
      return null;
    }

    const originalPath = resolveWithinRoot(appConfig.galleryRoot, imageRecord.absolute_path);
    const thumbnailPath = resolveWithinRoot(appConfig.thumbnailsDir, path.join(appConfig.thumbnailsDir, imageRecord.thumbnail_path));
    const previewPath = resolveWithinRoot(appConfig.previewsDir, path.join(appConfig.previewsDir, imageRecord.preview_path));

    if (!originalPath) {
      throw new Error('Stored image path is outside the gallery root');
    }

    if (!thumbnailPath && imageRecord.thumbnail_path) {
      throw new Error('Stored thumbnail path is outside the thumbnails root');
    }

    if (!previewPath && imageRecord.preview_path) {
      throw new Error('Stored preview path is outside the previews root');
    }

    await Promise.all([
      removeFileIfPresent(originalPath),
      removeFileIfPresent(thumbnailPath),
      removeFileIfPresent(previewPath)
    ]);

    likeRepository.remove(imageRecord.id);
    imageRepository.markDeleted(imageRecord.relative_path);
    folderRepository.setAvatar(imageRecord.folder_id, imageRepository.getLatestFolderImageId(imageRecord.folder_id));

    return {
      id: imageRecord.id,
      folderSlug: imageDetail.folderSlug
    };
  },

  async deleteFolder(slug: string) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const folder = folderRepository.getBySlug(slug);
    if (!folder) {
      return null;
    }

    const imageCount = imageRepository.countByFolder(folder.id);

    // Resolve and validate the folder path before deleting
    const folderPath = resolveWithinRoot(appConfig.galleryRoot, path.join(appConfig.galleryRoot, folder.folder_path));
    if (!folderPath) {
      throw new Error('Stored folder path is outside the gallery root');
    }

    // Delete the entire folder from disk (originals, everything inside)
    await fsPromises.rm(folderPath, { recursive: true, force: true });

    // Delete thumbnail and preview directories for this folder.
    const thumbnailFolderPath = resolveWithinRoot(appConfig.thumbnailsDir, path.join(appConfig.thumbnailsDir, folder.folder_path));
    const previewFolderPath = resolveWithinRoot(appConfig.previewsDir, path.join(appConfig.previewsDir, folder.folder_path));

    if (thumbnailFolderPath) {
      await fsPromises.rm(thumbnailFolderPath, { recursive: true, force: true });
    }

    if (previewFolderPath) {
      await fsPromises.rm(previewFolderPath, { recursive: true, force: true });
    }

    // DB cleanup
    likeRepository.removeByFolder(folder.id);
    imageRepository.markAllDeletedByFolder(folder.id);
    folderScanStateRepository.deleteMissing(
      folderScanStateRepository.getAll()
        .map((s) => s.folder_path)
        .filter((fp) => fp !== folder.folder_path)
    );
    folderRepository.delete(folder.id);

    return {
      slug: folder.slug,
      deletedImageCount: imageCount
    };
  }
};
