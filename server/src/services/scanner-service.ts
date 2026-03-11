import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';

import pLimit from 'p-limit';

import { appConfig } from '../config/env.js';
import { appSettingsRepository, folderScanStateRepository, imageRepository, profileRepository, scanRunRepository } from '../db/repositories.js';
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
import {
  createFolderScanSignature,
  resolveFullScanOptions,
  shouldQueueDerivativeJobForStatus,
  shouldRefreshUnchangedImage,
  shouldSkipFolderBySignature,
  type FullScanOptions,
  type IndexedFileStatus
} from '../utils/scan-utils.js';
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
  status: IndexedFileStatus;
  derivativeJob: DerivativeJob | null;
  refreshedIndexedRow: boolean;
  relativePath: string;
}

interface IndexedFileCandidate {
  absolutePath: string;
  relativePath: string;
  stats: Stats;
}

interface ResolvedProfileResult {
  profile: ProfileRecord;
  wroteProfile: boolean;
}

interface ImageProcessingContext {
  galleryRootChanged: boolean;
  hasStoredGalleryRoot: boolean;
}

interface FullScanMetrics {
  folderShortcutHits: number;
  folderShortcutImagesSkipped: number;
  folderShortcutMisses: number;
  folderWritesCommitted: number;
  folderWritesSkipped: number;
  unchangedFiles: number;
  unchangedFilesQueuedForDerivativeVerification: number;
  unchangedFilesSkippedDerivativeVerification: number;
  unchangedRowsRefreshed: number;
  unchangedRowsSkippedRefresh: number;
  discoveryDurationMs: number;
  derivativeJobsQueued: number;
  removedFolderStateRows: number;
}

interface DerivativeProcessingSummary {
  durationMs: number;
  generatedPreviews: number;
  generatedThumbnails: number;
  queuedJobs: number;
}

type ScanPhase = 'idle' | 'discovery' | 'derivatives';

export interface ScanProgressSnapshot {
  isScanning: boolean;
  scanReason: string | null;
  phase: ScanPhase;
  startedAt: string | null;
  runId: number | null;
  discoveredFolders: number;
  processedFolders: number;
  discoveredImages: number;
  processedImages: number;
  queuedDerivativeJobs: number;
  processedDerivativeJobs: number;
  generatedThumbnails: number;
  generatedPreviews: number;
  currentFolder: string | null;
  lastCompletedScan: ScanRunRecord | null;
}

const discoveryLimit = pLimit(appConfig.scanDiscoveryConcurrency);
const derivativeLimit = pLimit(appConfig.scanDerivativeConcurrency);
const HEARTBEAT_INTERVAL_MS = 5000;
const LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY = 'scanner.last_successful_gallery_root';

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
    discoveredFolders: 0,
    processedFolders: 0,
    discoveredImages: 0,
    processedImages: 0,
    queuedDerivativeJobs: 0,
    processedDerivativeJobs: 0,
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

function elapsedMilliseconds(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
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
    const options = resolveFullScanOptions({ repairUnchangedDerivatives: false });

    log.info('Startup scan queued', options);
    void this.scanAll(reason, options).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Startup scan failed (${reason})`, message);
    });
  }

  async scanAll(reason = 'manual', options: Partial<FullScanOptions> = {}): Promise<ScanRunRecord | undefined> {
    const resolvedOptions = resolveFullScanOptions(options);

    await this.enqueue(async () => this.performFullScan(reason, resolvedOptions));
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
      discoveredFolders: this.progress.discoveredFolders,
      processedFolders: this.progress.processedFolders,
      discoveredImages: this.progress.discoveredImages,
      processedImages: this.progress.processedImages,
      queuedDerivativeJobs: this.progress.queuedDerivativeJobs,
      processedDerivativeJobs: this.progress.processedDerivativeJobs,
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

  private async performFullScan(reason: string, options: FullScanOptions): Promise<ScanSummary> {
    const runId = scanRunRepository.start();
    const summary = createEmptySummary();
    const errors: string[] = [];
    const derivativeJobs = new Map<string, DerivativeJob>();
    const metrics: FullScanMetrics = {
      folderShortcutHits: 0,
      folderShortcutImagesSkipped: 0,
      folderShortcutMisses: 0,
      folderWritesCommitted: 0,
      folderWritesSkipped: 0,
      unchangedFiles: 0,
      unchangedFilesQueuedForDerivativeVerification: 0,
      unchangedFilesSkippedDerivativeVerification: 0,
      unchangedRowsRefreshed: 0,
      unchangedRowsSkippedRefresh: 0,
      discoveryDurationMs: 0,
      derivativeJobsQueued: 0,
      removedFolderStateRows: 0
    };
    let derivativeSummary: DerivativeProcessingSummary = {
      durationMs: 0,
      generatedPreviews: 0,
      generatedThumbnails: 0,
      queuedJobs: 0
    };
    const scanStartedAt = performance.now();
    const currentGalleryRoot = normalizePath(appConfig.galleryRoot);
    const storedGalleryRoot = appSettingsRepository.get(LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY);
    const normalizedStoredGalleryRoot = storedGalleryRoot ? normalizePath(storedGalleryRoot) : null;
    const hasStoredGalleryRoot = normalizedStoredGalleryRoot !== null;
    const galleryRootChanged = normalizedStoredGalleryRoot !== currentGalleryRoot;
    const imageProcessingContext: ImageProcessingContext = {
      galleryRootChanged,
      hasStoredGalleryRoot
    };

    if (!storageService.refreshAvailability().libraryAvailable) {
      return this.finishUnavailableRun(runId, reason);
    }

    this.beginProgress(reason, runId);
    log.info(`Starting full scan (${reason})`, {
      options,
      hasStoredGalleryRoot,
      galleryRootChanged,
      concurrency: {
        discovery: appConfig.scanDiscoveryConcurrency,
        derivatives: appConfig.scanDerivativeConcurrency
      }
    });

    try {
      const existingProfiles = profileRepository.getAll();
      const folderScanStates = new Map(
        folderScanStateRepository.getAll().map((state) => [normalizePath(state.folder_path), state])
      );
      const usedSlugs = new Set(existingProfiles.map((profile) => profile.slug));
      const directories = await fs.readdir(appConfig.galleryRoot, { withFileTypes: true });
      const profileDirectories = directories.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
      const activeFolderPaths = new Set<string>();
      const discoveredProfileIds = new Set<number>();
      const discoveryStartedAt = performance.now();

      this.setProgress({ discoveredFolders: profileDirectories.length });

      for (const directory of profileDirectories) {
        const profilePath = path.join(appConfig.galleryRoot, directory.name);
        const folderKey = normalizePath(directory.name);
        activeFolderPaths.add(folderKey);
        this.setProgress({ currentFolder: directory.name });
        const profileStartedAt = performance.now();
        let unchangedFiles = 0;
        let newFiles = 0;
        let updatedFiles = 0;
        let refreshedUnchangedRows = 0;
        let skippedUnchangedRows = 0;
        let usedFolderShortcut = false;

        const resolvedProfile = this.resolveProfile(existingProfiles, usedSlugs, directory.name, profilePath);
        const profile = resolvedProfile.profile;
        discoveredProfileIds.add(profile.id);
        if (resolvedProfile.wroteProfile) {
          metrics.folderWritesCommitted += 1;
        } else {
          metrics.folderWritesSkipped += 1;
        }
        const activeRelativePaths: string[] = [];

        const entries = await fs.readdir(profilePath, { withFileTypes: true });
        const imageFiles = entries.filter((entry) => entry.isFile() && isSupportedImageFile(entry.name) && !entry.name.startsWith('.'));
        const discoveredFiles: IndexedFileCandidate[] = [];
        let folderHadErrors = false;

        summary.scanned_files += imageFiles.length;
        this.setProgress({
          discoveredImages: this.progress.discoveredImages + imageFiles.length
        });

        await Promise.all(
          imageFiles.map((entry) =>
            discoveryLimit(async () => {
              const absolutePath = path.join(profilePath, entry.name);
              const relativePath = getRelativeGalleryPath(appConfig.galleryRoot, absolutePath);
              activeRelativePaths.push(relativePath);

              try {
                const stats = await fs.stat(absolutePath);
                discoveredFiles.push({
                  absolutePath,
                  relativePath,
                  stats
                });
              } catch (error) {
                folderHadErrors = true;
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`${directory.name}/${entry.name}: ${message}`);
                this.setProgress({
                  processedImages: this.progress.processedImages + 1
                });
                log.error('Failed to stat image during discovery', { file: entry.name, error: message });
              }
            })
          )
        );

        const folderSignature = createFolderScanSignature(
          discoveredFiles.map((file) => ({
            relativePath: file.relativePath,
            fileSize: file.stats.size,
            mtimeMs: file.stats.mtimeMs
          }))
        );
        const storedFolderState = folderScanStates.get(folderKey);

        if (
          !folderHadErrors &&
          shouldSkipFolderBySignature({
            currentSignature: folderSignature.signature,
            galleryRootChanged,
            hasStoredGalleryRoot,
            repairUnchangedDerivatives: options.repairUnchangedDerivatives,
            storedSignature: storedFolderState?.signature ?? null
          })
        ) {
          usedFolderShortcut = true;
          metrics.folderShortcutHits += 1;
          metrics.folderShortcutImagesSkipped += discoveredFiles.length;
          metrics.unchangedFiles += discoveredFiles.length;
          metrics.unchangedFilesSkippedDerivativeVerification += discoveredFiles.length;
          metrics.unchangedRowsSkippedRefresh += discoveredFiles.length;

          this.setProgress({
            processedImages: this.progress.processedImages + discoveredFiles.length,
            processedFolders: this.progress.processedFolders + 1
          });
          this.logProgress('profile');
          log.info('Full scan folder shortcut hit', {
            folder: directory.name,
            durationMs: elapsedMilliseconds(profileStartedAt),
            fileCount: discoveredFiles.length,
            storedSignatureMatched: true
          });

          continue;
        }

        metrics.folderShortcutMisses += 1;

        await Promise.all(
          discoveredFiles.map((file) =>
            discoveryLimit(async () => {
              try {
                const result = await this.processImageFile(profile, file, options, imageProcessingContext);

                if (result.status === 'new') {
                  summary.new_files += 1;
                  newFiles += 1;
                }

                if (result.status === 'updated') {
                  summary.updated_files += 1;
                  updatedFiles += 1;
                }

                if (result.status === 'unchanged') {
                  unchangedFiles += 1;
                  metrics.unchangedFiles += 1;
                  if (result.refreshedIndexedRow) {
                    refreshedUnchangedRows += 1;
                    metrics.unchangedRowsRefreshed += 1;
                  } else {
                    skippedUnchangedRows += 1;
                    metrics.unchangedRowsSkippedRefresh += 1;
                  }
                }

                if (result.derivativeJob) {
                  this.queueDerivativeJob(derivativeJobs, result.derivativeJob);

                  if (result.status === 'unchanged') {
                    metrics.unchangedFilesQueuedForDerivativeVerification += 1;
                  }
                } else if (result.status === 'unchanged') {
                  metrics.unchangedFilesSkippedDerivativeVerification += 1;
                }
              } catch (error) {
                folderHadErrors = true;
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`${directory.name}/${path.basename(file.relativePath)}: ${message}`);
                log.error('Failed to index image', { file: file.relativePath, error: message });
              } finally {
                this.setProgress({
                  processedImages: this.progress.processedImages + 1
                });
              }
            })
          )
        );

        const removedFiles = imageRepository.markProfileImagesDeleted(profile.id, activeRelativePaths);
        summary.removed_files += removedFiles;
        profileRepository.setAvatar(profile.id, imageRepository.getLatestProfileImageId(profile.id));

        if (!folderHadErrors) {
          folderScanStateRepository.upsert({
            folderPath: folderKey,
            signature: folderSignature.signature,
            fileCount: folderSignature.fileCount,
            maxMtimeMs: folderSignature.maxMtimeMs,
            totalSize: folderSignature.totalSize
          });
          folderScanStates.set(folderKey, {
            folder_path: folderKey,
            signature: folderSignature.signature,
            file_count: folderSignature.fileCount,
            max_mtime_ms: folderSignature.maxMtimeMs,
            total_size: folderSignature.totalSize,
            updated_at: new Date().toISOString()
          });
        }

        this.setProgress({
          processedFolders: this.progress.processedFolders + 1
        });
        this.logProgress('profile');
        log.info('Full scan folder processed', {
          folder: directory.name,
          durationMs: elapsedMilliseconds(profileStartedAt),
          scannedFiles: imageFiles.length,
          unchangedFiles,
          newFiles,
          updatedFiles,
          removedFiles,
          refreshedUnchangedRows,
          skippedUnchangedRows,
          usedFolderShortcut
        });
      }

      for (const profile of existingProfiles) {
        if (!discoveredProfileIds.has(profile.id)) {
          summary.removed_files += imageRepository.markAllDeletedByProfile(profile.id);
          profileRepository.setAvatar(profile.id, null);
        }
      }

      metrics.removedFolderStateRows = folderScanStateRepository.deleteMissing([...activeFolderPaths]);

      metrics.discoveryDurationMs = elapsedMilliseconds(discoveryStartedAt);
      metrics.derivativeJobsQueued = derivativeJobs.size;

      log.info('Full scan discovery completed', {
        reason,
        durationMs: metrics.discoveryDurationMs,
        galleryRootChanged,
        hasStoredGalleryRoot,
        scannedFiles: summary.scanned_files,
        folderShortcutHits: metrics.folderShortcutHits,
        folderShortcutMisses: metrics.folderShortcutMisses,
        folderShortcutImagesSkipped: metrics.folderShortcutImagesSkipped,
        folderWritesCommitted: metrics.folderWritesCommitted,
        folderWritesSkipped: metrics.folderWritesSkipped,
        unchangedFiles: metrics.unchangedFiles,
        newFiles: summary.new_files,
        updatedFiles: summary.updated_files,
        removedFiles: summary.removed_files,
        unchangedRowsRefreshed: metrics.unchangedRowsRefreshed,
        unchangedRowsSkippedRefresh: metrics.unchangedRowsSkippedRefresh,
        derivativeJobsQueued: metrics.derivativeJobsQueued,
        unchangedFilesQueuedForDerivativeVerification: metrics.unchangedFilesQueuedForDerivativeVerification,
        unchangedFilesSkippedDerivativeVerification: metrics.unchangedFilesSkippedDerivativeVerification,
        removedFolderStateRows: metrics.removedFolderStateRows
      });

      derivativeSummary = await this.processDerivativeJobs([...derivativeJobs.values()], errors);
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

    if (summary.status !== 'failed') {
      appSettingsRepository.set(LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY, currentGalleryRoot);
    }

    this.finishRun(runId, summary);
    log.info(`Finished full scan (${reason})`, {
      summary,
      options,
      galleryRoot: {
        current: currentGalleryRoot,
        previous: normalizedStoredGalleryRoot,
        changed: galleryRootChanged,
        hadStoredValue: hasStoredGalleryRoot
      },
      concurrency: {
        discovery: appConfig.scanDiscoveryConcurrency,
        derivatives: appConfig.scanDerivativeConcurrency
      },
      timings: {
        totalDurationMs: elapsedMilliseconds(scanStartedAt),
        discoveryDurationMs: metrics.discoveryDurationMs,
        derivativeDurationMs: derivativeSummary.durationMs
      },
      folderShortcuts: {
        hits: metrics.folderShortcutHits,
        misses: metrics.folderShortcutMisses,
        imagesSkipped: metrics.folderShortcutImagesSkipped,
        removedStateRows: metrics.removedFolderStateRows
      },
      folderWrites: {
        committed: metrics.folderWritesCommitted,
        skipped: metrics.folderWritesSkipped
      },
      derivatives: {
        queuedJobs: derivativeSummary.queuedJobs,
        generatedThumbnails: derivativeSummary.generatedThumbnails,
        generatedPreviews: derivativeSummary.generatedPreviews
      },
      unchangedFiles: {
        total: metrics.unchangedFiles,
        queuedForDerivativeVerification: metrics.unchangedFilesQueuedForDerivativeVerification,
        skippedDerivativeVerification: metrics.unchangedFilesSkippedDerivativeVerification,
        refreshedRows: metrics.unchangedRowsRefreshed,
        skippedRefreshRows: metrics.unchangedRowsSkippedRefresh
      }
    });
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
      discoveredFolders: impactedFolders.size,
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
        const profile = this.resolveProfile(existingProfiles, usedSlugs, folderName, path.join(appConfig.galleryRoot, folderName)).profile;

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

          const result = await this.processImageFile(
            profile,
            {
              absolutePath,
              relativePath,
              stats
            }
          );
          if (result.derivativeJob) {
            this.queueDerivativeJob(derivativeJobs, result.derivativeJob);
          }
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
          processedFolders: impactedFolders.size
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
      return this.performFullScan(fallbackReason, resolveFullScanOptions());
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

  private async processDerivativeJobs(jobs: DerivativeJob[], errors: string[]): Promise<DerivativeProcessingSummary> {
    const startedAt = performance.now();
    let generatedThumbnails = 0;
    let generatedPreviews = 0;

    if (jobs.length === 0) {
      this.setProgress({
        queuedDerivativeJobs: 0,
        processedDerivativeJobs: 0
      });

      return {
        durationMs: 0,
        generatedPreviews: 0,
        generatedThumbnails: 0,
        queuedJobs: 0
      };
    }

    this.setProgress({
      phase: 'derivatives',
      queuedDerivativeJobs: jobs.length,
      processedDerivativeJobs: 0,
      currentFolder: jobs[0] ? getProfileSlugFromRelativePath(jobs[0].relativePath) : null
    });
    this.logProgress('phase');
    log.info('Starting derivative phase', {
      queuedJobs: jobs.length,
      concurrency: appConfig.scanDerivativeConcurrency
    });

    await Promise.all(
      jobs.map((job) =>
        derivativeLimit(async () => {
          try {
            this.setProgress({
              currentFolder: getProfileSlugFromRelativePath(job.relativePath)
            });

            const derivatives = await generateDerivatives(job.absolutePath, job.relativePath, job.force);

            if (derivatives.generatedThumbnail) {
              generatedThumbnails += 1;
              this.setProgress({
                generatedThumbnails: this.progress.generatedThumbnails + 1
              });
            }

            if (derivatives.generatedPreview) {
              generatedPreviews += 1;
              this.setProgress({
                generatedPreviews: this.progress.generatedPreviews + 1
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${job.relativePath}: ${message}`);
            log.error('Derivative generation failed', { relativePath: job.relativePath, error: message });
          } finally {
            this.setProgress({
              processedDerivativeJobs: this.progress.processedDerivativeJobs + 1
            });
          }
        })
      )
    );

    const summary = {
      durationMs: elapsedMilliseconds(startedAt),
      generatedPreviews,
      generatedThumbnails,
      queuedJobs: jobs.length
    };

    log.info('Finished derivative phase', summary);

    return summary;
  }

  private resolveProfile(existingProfiles: ProfileRecord[], usedSlugs: Set<string>, folderName: string, folderPath: string): ResolvedProfileResult {
    const existingByFolder = existingProfiles.find((profile) => normalizePath(profile.folder_path) === normalizePath(folderPath));
    if (existingByFolder) {
      const saved = profileRepository.save({
        slug: existingByFolder.slug,
        name: folderName,
        folderPath
      });
      this.rememberProfile(existingProfiles, saved.profile);
      return {
        profile: saved.profile,
        wroteProfile: saved.wrote
      };
    }

    const existingByName = existingProfiles.find((profile) => profile.name === folderName);
    if (existingByName) {
      const saved = profileRepository.save({
        slug: existingByName.slug,
        name: folderName,
        folderPath
      });
      this.rememberProfile(existingProfiles, saved.profile);
      return {
        profile: saved.profile,
        wroteProfile: saved.wrote
      };
    }

    const baseSlug = slugifyProfileName(folderName);
    const existingBySlug = existingProfiles.find((profile) => profile.slug === baseSlug);
    if (existingBySlug) {
      const saved = profileRepository.save({
        slug: existingBySlug.slug,
        name: folderName,
        folderPath
      });
      this.rememberProfile(existingProfiles, saved.profile);
      return {
        profile: saved.profile,
        wroteProfile: saved.wrote
      };
    }

    const slug = resolveUniqueSlug(folderName, usedSlugs);
    const saved = profileRepository.save({
      slug,
      name: folderName,
      folderPath
    });
    this.rememberProfile(existingProfiles, saved.profile);
    return {
      profile: saved.profile,
      wroteProfile: saved.wrote
    };
  }

  private rememberProfile(existingProfiles: ProfileRecord[], profile: ProfileRecord): void {
    const existingIndex = existingProfiles.findIndex((entry) => entry.id === profile.id);

    if (existingIndex >= 0) {
      existingProfiles[existingIndex] = profile;
      return;
    }

    existingProfiles.push(profile);
  }

  private async processImageFile(
    profile: ProfileRecord,
    file: IndexedFileCandidate,
    options: FullScanOptions = resolveFullScanOptions(),
    context: ImageProcessingContext = {
      galleryRootChanged: false,
      hasStoredGalleryRoot: false
    }
  ): Promise<ProcessedFileSummary> {
    const fingerprint = createFingerprint(file.relativePath, file.stats.size, file.stats.mtimeMs);
    const existing = imageRepository.getByRelativePath(file.relativePath);
    const extension = path.extname(file.absolutePath).toLowerCase();
    const absolutePathChanged = existing ? normalizePath(existing.absolute_path) !== normalizePath(file.absolutePath) : false;
    const derivativeRelativePath = getDerivativeRelativePath(file.relativePath);

    if (existing && existing.checksum_or_fingerprint === fingerprint) {
      const refreshedIndexedRow = shouldRefreshUnchangedImage({
        absolutePathChanged,
        galleryRootChanged: context.galleryRootChanged,
        hasStoredGalleryRoot: context.hasStoredGalleryRoot,
        isDeleted: existing.is_deleted === 1
      });

      if (refreshedIndexedRow) {
        imageRepository.refreshIndexed({
          profileId: profile.id,
          filename: path.basename(file.absolutePath),
          extension,
          relativePath: file.relativePath,
          absolutePath: file.absolutePath,
          fileSize: file.stats.size,
          mimeType: getMimeTypeFromExtension(extension),
          fingerprint,
          mtimeMs: file.stats.mtimeMs,
          thumbnailPath: existing.thumbnail_path || derivativeRelativePath,
          previewPath: existing.preview_path || derivativeRelativePath
        });
      }

      return {
        status: 'unchanged',
        derivativeJob: shouldQueueDerivativeJobForStatus('unchanged', options)
          ? {
              absolutePath: file.absolutePath,
              relativePath: file.relativePath,
              force: false
            }
          : null,
        refreshedIndexedRow,
        relativePath: file.relativePath
      };
    }

    const metadata = await readImageMetadata(file.absolutePath);
    const sortTimestamp = getStableSortTimestamp(
      existing
        ? {
            sortTimestamp: existing.sort_timestamp,
            firstSeenAt: existing.first_seen_at
          }
        : null,
      file.stats.mtimeMs
    );
    const firstSeenAt = existing?.first_seen_at ?? new Date().toISOString();

    imageRepository.upsert({
      profileId: profile.id,
      filename: path.basename(file.absolutePath),
      extension,
      relativePath: file.relativePath,
      absolutePath: file.absolutePath,
      fileSize: file.stats.size,
      width: metadata.width,
      height: metadata.height,
      mimeType: getMimeTypeFromExtension(extension),
      fingerprint,
      mtimeMs: file.stats.mtimeMs,
      firstSeenAt,
      sortTimestamp,
      thumbnailPath: derivativeRelativePath,
      previewPath: derivativeRelativePath
    });

    return {
      status: existing ? 'updated' : 'new',
      derivativeJob: {
        absolutePath: file.absolutePath,
        relativePath: file.relativePath,
        force: true
      },
      refreshedIndexedRow: false,
      relativePath: file.relativePath
    };
  }
}

export const scannerService = new ScannerService();
