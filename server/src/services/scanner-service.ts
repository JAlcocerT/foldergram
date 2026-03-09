import fs from 'node:fs/promises';
import path from 'node:path';

import pLimit from 'p-limit';

import { appConfig } from '../config/env.js';
import { imageRepository, profileRepository, scanRunRepository } from '../db/repositories.js';
import { generateDerivatives } from './derivative-service.js';
import { log } from './log-service.js';
import { createFingerprint, getMimeTypeFromExtension, getStableSortTimestamp, isSupportedImageFile } from '../utils/image-utils.js';
import { getProfileSlugFromRelativePath, getRelativeGalleryPath, isHiddenPath, normalizePath } from '../utils/path-utils.js';
import { resolveUniqueSlug, slugifyProfileName } from '../utils/slug.js';
import type { ProfileRecord, ScanRunRecord } from '../types/models.js';

interface ScanSummary {
  status: string;
  scanned_files: number;
  new_files: number;
  updated_files: number;
  removed_files: number;
  error_text: string | null;
}

interface ProcessedFileSummary {
  status: 'unchanged' | 'new' | 'updated';
  relativePath: string;
}

const processingLimit = pLimit(4);

function createEmptySummary(): ScanSummary {
  return {
    status: 'completed',
    scanned_files: 0,
    new_files: 0,
    updated_files: 0,
    removed_files: 0,
    error_text: null
  };
}

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

class ScannerService {
  private queue = Promise.resolve<ScanSummary>(createEmptySummary());

  async scanAll(reason = 'manual'): Promise<ScanRunRecord | undefined> {
    await this.enqueue(async () => this.performFullScan(reason));
    return scanRunRepository.latest();
  }

  async scanChangedPaths(relativePaths: string[], reason = 'watcher'): Promise<ScanRunRecord | undefined> {
    if (relativePaths.length === 0) {
      return scanRunRepository.latest();
    }

    await this.enqueue(async () => this.performIncrementalScan(relativePaths, reason));
    return scanRunRepository.latest();
  }

  private async enqueue(job: () => Promise<ScanSummary>): Promise<ScanSummary> {
    this.queue = this.queue.then(job, job);
    return this.queue;
  }

  private async performFullScan(reason: string): Promise<ScanSummary> {
    const runId = scanRunRepository.start();
    const summary = createEmptySummary();
    const errors: string[] = [];

    log.info(`Starting full scan (${reason})`);

    try {
      const existingProfiles = profileRepository.getAll();
      const usedSlugs = new Set(existingProfiles.map((profile) => profile.slug));
      const directories = await fs.readdir(appConfig.galleryRoot, { withFileTypes: true });
      const profileDirectories = directories.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
      const activeFolderPaths = new Set<string>();

      for (const directory of profileDirectories) {
        const profilePath = path.join(appConfig.galleryRoot, directory.name);
        activeFolderPaths.add(normalizePath(profilePath));
        const profile = this.resolveProfile(existingProfiles, usedSlugs, directory.name, profilePath);
        const activeRelativePaths: string[] = [];

        const entries = await fs.readdir(profilePath, { withFileTypes: true });
        const imageFiles = entries.filter((entry) => entry.isFile() && isSupportedImageFile(entry.name) && !entry.name.startsWith('.'));
        summary.scanned_files += imageFiles.length;

        await Promise.all(
          imageFiles.map((entry) =>
            processingLimit(async () => {
              try {
                const absolutePath = path.join(profilePath, entry.name);
                const relativePath = getRelativeGalleryPath(appConfig.galleryRoot, absolutePath);
                activeRelativePaths.push(relativePath);

                const result = await this.processImageFile(profile, absolutePath, relativePath);
                if (result.status === 'new') {
                  summary.new_files += 1;
                }
                if (result.status === 'updated') {
                  summary.updated_files += 1;
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`${directory.name}/${entry.name}: ${message}`);
                log.error('Failed to process image', { file: entry.name, error: message });
              }
            })
          )
        );

        summary.removed_files += imageRepository.markProfileImagesDeleted(profile.id, activeRelativePaths);
        profileRepository.setAvatar(profile.id, imageRepository.getLatestProfileImageId(profile.id));
      }

      for (const profile of existingProfiles) {
        if (!activeFolderPaths.has(normalizePath(profile.folder_path))) {
          summary.removed_files += imageRepository.markAllDeletedByProfile(profile.id);
          profileRepository.setAvatar(profile.id, null);
        }
      }
    } catch (error) {
      summary.status = 'failed';
      summary.error_text = error instanceof Error ? error.message : String(error);
      log.error('Full scan failed', summary.error_text);
    }

    if (errors.length > 0) {
      summary.error_text = errors.join('\n').slice(0, 8000);
      if (summary.status !== 'failed') {
        summary.status = 'completed_with_errors';
      }
    }

    scanRunRepository.finish(runId, {
      ...summary,
      finished_at: new Date().toISOString()
    });

    log.info(`Finished full scan (${reason})`, summary);
    return summary;
  }

  private async performIncrementalScan(relativePaths: string[], reason: string): Promise<ScanSummary> {
    const runId = scanRunRepository.start();
    const summary = createEmptySummary();
    const errors: string[] = [];
    const impactedProfileIds = new Set<number>();
    let fallbackReason: string | null = null;

    log.info(`Starting incremental scan (${reason})`, { count: relativePaths.length });

    try {
      const existingProfiles = profileRepository.getAll();
      const usedSlugs = new Set(existingProfiles.map((profile) => profile.slug));
      const normalizedPaths = [...new Set(relativePaths.map((value) => normalizePath(value)).filter(Boolean))];

      for (const relativePath of normalizedPaths) {
        if (isHiddenPath(relativePath)) {
          continue;
        }

        const segments = relativePath.split('/');
        if (segments.length !== 2) {
          fallbackReason = `${reason}:fallback`;
          break;
        }

        const [folderName, filename] = segments;
        if (!isSupportedImageFile(filename)) {
          continue;
        }

        const absolutePath = path.join(appConfig.galleryRoot, relativePath);
        const profile = this.resolveProfile(existingProfiles, usedSlugs, folderName, path.join(appConfig.galleryRoot, folderName));

        if (!(await directoryExists(path.join(appConfig.galleryRoot, folderName)))) {
          fallbackReason = `${reason}:profile-removed`;
          break;
        }

        summary.scanned_files += 1;

        try {
          const stats = await fs.stat(absolutePath).catch(() => null);
          if (!stats || !stats.isFile()) {
            imageRepository.markDeleted(relativePath);
            impactedProfileIds.add(profile.id);
            summary.removed_files += 1;
            continue;
          }

          const result = await this.processImageFile(profile, absolutePath, relativePath);
          impactedProfileIds.add(profile.id);

          if (result.status === 'new') {
            summary.new_files += 1;
          }
          if (result.status === 'updated') {
            summary.updated_files += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${relativePath}: ${message}`);
          log.error('Incremental image processing failed', { relativePath, error: message });
        }
      }

      for (const profileId of impactedProfileIds) {
        profileRepository.setAvatar(profileId, imageRepository.getLatestProfileImageId(profileId));
      }
    } catch (error) {
      summary.status = 'failed';
      summary.error_text = error instanceof Error ? error.message : String(error);
      log.error('Incremental scan failed', summary.error_text);
    }

    if (errors.length > 0) {
      summary.error_text = errors.join('\n').slice(0, 8000);
      if (summary.status !== 'failed') {
        summary.status = 'completed_with_errors';
      }
    }

    scanRunRepository.finish(runId, {
      ...summary,
      finished_at: new Date().toISOString()
    });

    log.info(`Finished incremental scan (${reason})`, summary);

    if (fallbackReason) {
      return this.performFullScan(fallbackReason);
    }

    return summary;
  }

  private resolveProfile(existingProfiles: ProfileRecord[], usedSlugs: Set<string>, folderName: string, folderPath: string): ProfileRecord {
    const existingByFolder = existingProfiles.find((profile) => normalizePath(profile.folder_path) === normalizePath(folderPath));
    if (existingByFolder) {
      return profileRepository.upsert({
        slug: existingByFolder.slug,
        name: folderName,
        folderPath
      });
    }

    const baseSlug = slugifyProfileName(folderName);
    const existingBySlug = existingProfiles.find((profile) => profile.slug === baseSlug);
    if (existingBySlug) {
      return profileRepository.upsert({
        slug: existingBySlug.slug,
        name: folderName,
        folderPath
      });
    }

    const slug = resolveUniqueSlug(folderName, usedSlugs);
    return profileRepository.upsert({
      slug,
      name: folderName,
      folderPath
    });
  }

  private async processImageFile(profile: ProfileRecord, absolutePath: string, relativePath: string): Promise<ProcessedFileSummary> {
    const stats = await fs.stat(absolutePath);
    const fingerprint = createFingerprint(relativePath, stats.size, stats.mtimeMs);
    const existing = imageRepository.getByRelativePath(relativePath);

    if (existing && existing.checksum_or_fingerprint === fingerprint) {
      if (existing.is_deleted) {
        imageRepository.reactivate(relativePath);
      }

      await generateDerivatives(absolutePath, relativePath, false);
      return {
        status: 'unchanged',
        relativePath
      };
    }

    const derivatives = await generateDerivatives(absolutePath, relativePath, !existing || existing.checksum_or_fingerprint !== fingerprint);
    const extension = path.extname(absolutePath).toLowerCase();
    const sortTimestamp = getStableSortTimestamp(
      existing
        ? {
            sortTimestamp: existing.sort_timestamp,
            firstSeenAt: existing.first_seen_at
          }
        : null,
      stats.mtimeMs
    );
    const firstSeenAt = existing?.first_seen_at ?? new Date().toISOString();

    imageRepository.upsert({
      profileId: profile.id,
      filename: path.basename(absolutePath),
      extension,
      relativePath,
      absolutePath,
      fileSize: stats.size,
      width: derivatives.width,
      height: derivatives.height,
      mimeType: getMimeTypeFromExtension(extension),
      fingerprint,
      mtimeMs: stats.mtimeMs,
      firstSeenAt,
      sortTimestamp,
      thumbnailPath: derivatives.thumbnailPath,
      previewPath: derivatives.previewPath
    });

    return {
      status: existing ? 'updated' : 'new',
      relativePath
    };
  }
}

export const scannerService = new ScannerService();
