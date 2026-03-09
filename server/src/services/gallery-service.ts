import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { appConfig } from '../config/env.js';
import { imageRepository, likeRepository, profileRepository, scanRunRepository } from '../db/repositories.js';
import type { FeedImage, ImageDetail, ProfileRecord } from '../types/models.js';
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

function buildProfileSummary(profile: ProfileRecord) {
  const imageCount = imageRepository.countByProfile(profile.id);
  const avatarImageId = profile.avatar_image_id ?? imageRepository.getLatestProfileImageId(profile.id);
  const avatar = avatarImageId ? imageRepository.getImageDetail(avatarImageId) : undefined;

  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    folderPath: profile.folder_path,
    imageCount,
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

  listProfiles() {
    if (!storageService.getState().libraryAvailable) {
      return [];
    }

    return profileRepository.getAll().map(buildProfileSummary);
  },

  getProfileBySlug(slug: string) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const profile = profileRepository.getBySlug(slug);
    if (!profile) {
      return null;
    }

    return buildProfileSummary(profile);
  },

  getProfileImages(slug: string, page: number, limit: number) {
    if (!storageService.getState().libraryAvailable) {
      return null;
    }

    const profile = profileRepository.getBySlug(slug);
    if (!profile) {
      return null;
    }

    const total = imageRepository.countByProfile(profile.id);

    return {
      profile: buildProfileSummary(profile),
      items: imageRepository.listProfileImages(profile.id, page, limit).map(mapFeedImage),
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

    return {
      profiles: storageState.libraryAvailable ? profileRepository.count() : 0,
      indexedImages: storageState.libraryAvailable ? imageRepository.countFeed() : 0,
      deletedImages: storageState.libraryAvailable ? imageRepository.countDeleted() : 0,
      thumbnailCount: storageState.libraryAvailable ? imageRepository.countWithThumbnail() : 0,
      previewCount: storageState.libraryAvailable ? imageRepository.countWithPreview() : 0,
      lastScan: lastScan ?? null,
      storage: {
        available: storageState.libraryAvailable,
        reason: storageState.reason,
        usingInMemoryDatabase: storageState.usingInMemoryDatabase
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
    profileRepository.setAvatar(imageRecord.profile_id, imageRepository.getLatestProfileImageId(imageRecord.profile_id));

    return {
      id: imageRecord.id,
      profileSlug: imageDetail.profileSlug
    };
  }
};
