import fs from 'node:fs/promises';
import path from 'node:path';

import pLimit from 'p-limit';

import { appConfig } from '../config/env.js';
import { imageRepository, profileRepository, scanRunRepository } from '../db/repositories.js';
import { generateDerivatives, readImageMetadata } from './derivative-service.js';
import { log } from './log-service.js';
import { storageService } from './storage-service.js';
import {
  createFingerprint,
  getDerivativeRelativePath,
  getMimeTypeFromExtension,
  getStableSortTimestamp,
  isSupportedImageFile
} from '../utils/image-utils.js';
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

interface DerivativeJob {
  absolutePath: string;
  relativePath: string;
  force: boolean;
}

interface ProcessedFileSummary {
  status: 'unchanged' | 'new' | 'updated';
  derivativeJob: DerivativeJob;
  relativePath: string;
}

type ScanPhase = 'idle' | 'discovery' | 'derivatives';

export interface ScanProgressSnapshot {
  isScanning: boolean;
  scanReason: string | null;
  phase: ScanPhase;
  startedAt: string | null;
  runId: number | null;
  discoveredProfiles: number;
  processedProfiles: number;
  discoveredImages: number;
  processedImages: number;
  generatedThumbnails: number;
  generatedPreviews: number;
  currentFolder: string | null;
  lastCompletedScan: ScanRunRecord | null;
}

const discoveryLimit = pLimit(4);
const derivativeLimit = pLimit(4);
const HEARTBEAT_INTERVAL_MS = 5000;

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

function createIdleProgress(lastCompletedScan: ScanRunRecord | null = null): ScanProgressSnapshot {
  return {
    isScanning: false,
    scanReason: null,
    phase: 'idle',
    startedAt: null,
    runId: null,
    discoveredProfiles: 0,
    processedProfiles: 0,
    discoveredImages: 0,
    processedImages: 0,
    generatedThumbnails: 0,
    generatedPreviews: 0,
    currentFolder: null,
    lastCompletedScan
  };
}

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) {
    return '00:00';
  }

  const elapsedMs = Math.max(0, Date.now() - Date.parse(startedAt));
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
  private progress = createIdleProgress(scanRunRepository.latestCompleted() ?? null);
  private heartbeatTimer: NodeJS.Timeout | null = null;

  getProgress(): ScanProgressSnapshot {
    return {
      ...this.progress,
      lastCompletedScan: this.progress.lastCompletedScan ? { ...this.progress.lastCompletedScan } : null
    };
  }

  startStartupScan(reason = 'startup'): void {
    log.info('Startup scan queued');
    void this.scanAll(reason).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Startup scan failed (${reason})`, message);
    });
  }

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

  private beginProgress(reason: string, runId: number): void {
    this.progress = {
      ...createIdleProgress(this.progress.lastCompletedScan),
      isScanning: true,
      scanReason: reason,
      phase: 'discovery',
      startedAt: new Date().toISOString(),
      runId
    };

    this.startHeartbeat();
    this.logProgress('started');
  }

  private setProgress(patch: Partial<Omit<ScanProgressSnapshot, 'lastCompletedScan'>>): void {
    this.progress = {
      ...this.progress,
      ...patch
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.logProgress('heartbeat');
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private logProgress(kind: 'started' | 'heartbeat' | 'profile' | 'phase' = 'heartbeat'): void {
    if (!this.progress.isScanning) {
      return;
    }

    log.info('Scan progress', {
      kind,
      reason: this.progress.scanReason,
      phase: this.progress.phase,
      discoveredProfiles: this.progress.discoveredProfiles,
      processedProfiles: this.progress.processedProfiles,
      discoveredImages: this.progress.discoveredImages,
      processedImages: this.progress.processedImages,
      generatedThumbnails: this.progress.generatedThumbnails,
      generatedPreviews: this.progress.generatedPreviews,
      currentFolder: this.progress.currentFolder,
      elapsed: formatElapsed(this.progress.startedAt)
    });
  }

  private finishProgress(): void {
    this.stopHeartbeat();
    this.progress = createIdleProgress(scanRunRepository.latestCompleted() ?? this.progress.lastCompletedScan);
  }

  private finishRun(runId: number, summary: ScanSummary): void {
    scanRunRepository.finish(runId, {
      ...summary,
      finished_at: new Date().toISOString()
    });
  }

  private finishUnavailableRun(runId: number, reason: string): ScanSummary {
    const storageState = storageService.refreshAvailability();
    const summary = {
      ...createEmptySummary(),
      status: 'skipped_unavailable',
      error_text: storageState.reason ?? 'Configured library storage is unavailable'
    };

    this.finishRun(runId, summary);
    this.finishProgress();

    log.info(`Skipped scan (${reason}) because configured storage is unavailable`, {
      reason: storageState.reason
    });

    return summary;
  }

  private async performFullScan(reason: string): Promise<ScanSummary> {
    const runId = scanRunRepository.start();
    const summary = createEmptySummary();
    const errors: string[] = [];
    const derivativeJobs = new Map<string, DerivativeJob>();

    if (!storageService.refreshAvailability().libraryAvailable) {
      return this.finishUnavailableRun(runId, reason);
    }

    this.beginProgress(reason, runId);
    log.info(`Starting full scan (${reason})`);

    try {
      const existingProfiles = profileRepository.getAll();
      const usedSlugs = new Set(existingProfiles.map((profile) => profile.slug));
      const directories = await fs.readdir(appConfig.galleryRoot, { withFileTypes: true });
      const profileDirectories = directories.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
      const activeFolderPaths = new Set<string>();

      this.setProgress({ discoveredProfiles: profileDirectories.length });

      for (const directory of profileDirectories) {
        const profilePath = path.join(appConfig.galleryRoot, directory.name);
        activeFolderPaths.add(normalizePath(profilePath));
        this.setProgress({ currentFolder: directory.name });

        const profile = this.resolveProfile(existingProfiles, usedSlugs, directory.name, profilePath);
        const activeRelativePaths: string[] = [];

        const entries = await fs.readdir(profilePath, { withFileTypes: true });
        const imageFiles = entries.filter((entry) => entry.isFile() && isSupportedImageFile(entry.name) && !entry.name.startsWith('.'));

        summary.scanned_files += imageFiles.length;
        this.setProgress({
          discoveredImages: this.progress.discoveredImages + imageFiles.length
        });

        await Promise.all(
          imageFiles.map((entry) =>
            discoveryLimit(async () => {
              try {
                const absolutePath = path.join(profilePath, entry.name);
                const relativePath = getRelativeGalleryPath(appConfig.galleryRoot, absolutePath);
                activeRelativePaths.push(relativePath);

                const result = await this.processImageFile(profile, absolutePath, relativePath);
                this.queueDerivativeJob(derivativeJobs, result.derivativeJob);

                if (result.status === 'new') {
                  summary.new_files += 1;
                }

                if (result.status === 'updated') {
                  summary.updated_files += 1;
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`${directory.name}/${entry.name}: ${message}`);
                log.error('Failed to index image', { file: entry.name, error: message });
              } finally {
                this.setProgress({
                  processedImages: this.progress.processedImages + 1
                });
              }
            })
          )
        );

        summary.removed_files += imageRepository.markProfileImagesDeleted(profile.id, activeRelativePaths);
        profileRepository.setAvatar(profile.id, imageRepository.getLatestProfileImageId(profile.id));

        this.setProgress({
          processedProfiles: this.progress.processedProfiles + 1
        });
        this.logProgress('profile');
      }

      for (const profile of existingProfiles) {
        if (!activeFolderPaths.has(normalizePath(profile.folder_path))) {
          summary.removed_files += imageRepository.markAllDeletedByProfile(profile.id);
          profileRepository.setAvatar(profile.id, null);
        }
      }

      await this.processDerivativeJobs([...derivativeJobs.values()], errors);
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

    this.finishRun(runId, summary);
    log.info(`Finished full scan (${reason})`, summary);
    this.finishProgress();

    return summary;
  }

  private async performIncrementalScan(relativePaths: string[], reason: string): Promise<ScanSummary> {
    const runId = scanRunRepository.start();
    const summary = createEmptySummary();
    const errors: string[] = [];
    const impactedProfileIds = new Set<number>();
    const derivativeJobs = new Map<string, DerivativeJob>();
    let fallbackReason: string | null = null;

    if (!storageService.refreshAvailability().libraryAvailable) {
      return this.finishUnavailableRun(runId, reason);
    }

    const normalizedPaths = [...new Set(relativePaths.map((value) => normalizePath(value)).filter(Boolean))];
    const impactedFolders = new Set(normalizedPaths.map((value) => getProfileSlugFromRelativePath(value)).filter(Boolean));

    this.beginProgress(reason, runId);
    this.setProgress({
      discoveredProfiles: impactedFolders.size,
      discoveredImages: normalizedPaths.length
    });

    log.info(`Starting incremental scan (${reason})`, { count: normalizedPaths.length });

    try {
      const existingProfiles = profileRepository.getAll();
      const usedSlugs = new Set(existingProfiles.map((profile) => profile.slug));

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

        this.setProgress({ currentFolder: folderName });

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
          this.queueDerivativeJob(derivativeJobs, result.derivativeJob);
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
          log.error('Incremental image indexing failed', { relativePath, error: message });
        } finally {
          this.setProgress({
            processedImages: this.progress.processedImages + 1
          });
        }
      }

      for (const profileId of impactedProfileIds) {
        profileRepository.setAvatar(profileId, imageRepository.getLatestProfileImageId(profileId));
      }

      if (fallbackReason === null) {
        this.setProgress({
          processedProfiles: impactedFolders.size
        });
        await this.processDerivativeJobs([...derivativeJobs.values()], errors);
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

    this.finishRun(runId, summary);
    log.info(`Finished incremental scan (${reason})`, summary);
    this.finishProgress();

    if (fallbackReason) {
      return this.performFullScan(fallbackReason);
    }

    return summary;
  }

  private queueDerivativeJob(queue: Map<string, DerivativeJob>, job: DerivativeJob): void {
    const existing = queue.get(job.relativePath);

    if (!existing) {
      queue.set(job.relativePath, job);
      return;
    }

    queue.set(job.relativePath, {
      ...job,
      force: existing.force || job.force
    });
  }

  private async processDerivativeJobs(jobs: DerivativeJob[], errors: string[]): Promise<void> {
    this.setProgress({
      phase: 'derivatives',
      currentFolder: jobs[0] ? getProfileSlugFromRelativePath(jobs[0].relativePath) : null
    });
    this.logProgress('phase');

    await Promise.all(
      jobs.map((job) =>
        derivativeLimit(async () => {
          try {
            this.setProgress({
              currentFolder: getProfileSlugFromRelativePath(job.relativePath)
            });

            const derivatives = await generateDerivatives(job.absolutePath, job.relativePath, job.force);

            if (derivatives.generatedThumbnail) {
              this.setProgress({
                generatedThumbnails: this.progress.generatedThumbnails + 1
              });
            }

            if (derivatives.generatedPreview) {
              this.setProgress({
                generatedPreviews: this.progress.generatedPreviews + 1
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${job.relativePath}: ${message}`);
            log.error('Derivative generation failed', { relativePath: job.relativePath, error: message });
          }
        })
      )
    );
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
    const extension = path.extname(absolutePath).toLowerCase();
    const derivativeRelativePath = getDerivativeRelativePath(relativePath);

    if (existing && existing.checksum_or_fingerprint === fingerprint) {
      imageRepository.refreshIndexed({
        profileId: profile.id,
        filename: path.basename(absolutePath),
        extension,
        relativePath,
        absolutePath,
        fileSize: stats.size,
        mimeType: getMimeTypeFromExtension(extension),
        fingerprint,
        mtimeMs: stats.mtimeMs,
        thumbnailPath: existing.thumbnail_path || derivativeRelativePath,
        previewPath: existing.preview_path || derivativeRelativePath
      });

      return {
        status: 'unchanged',
        derivativeJob: {
          absolutePath,
          relativePath,
          force: false
        },
        relativePath
      };
    }

    const metadata = await readImageMetadata(absolutePath);
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
      width: metadata.width,
      height: metadata.height,
      mimeType: getMimeTypeFromExtension(extension),
      fingerprint,
      mtimeMs: stats.mtimeMs,
      firstSeenAt,
      sortTimestamp,
      thumbnailPath: derivativeRelativePath,
      previewPath: derivativeRelativePath
    });

    return {
      status: existing ? 'updated' : 'new',
      derivativeJob: {
        absolutePath,
        relativePath,
        force: true
      },
      relativePath
    };
  }
}

export const scannerService = new ScannerService();
