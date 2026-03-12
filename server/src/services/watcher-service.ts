import chokidar, { type FSWatcher } from 'chokidar';

import { appConfig } from '../config/env.js';
import { scannerService } from './scanner-service.js';
import { log } from './log-service.js';
import { storageService } from './storage-service.js';
import { getRelativeGalleryPath, isHiddenPath } from '../utils/path-utils.js';

class WatcherService {
  private watcher: FSWatcher | null = null;
  private pendingPaths = new Set<string>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private fullRescanRequested = false;

  async start(): Promise<void> {
    if (this.watcher || !appConfig.isDevelopment) {
      return;
    }

    const storageState = storageService.refreshAvailability();
    if (!storageState.libraryAvailable) {
      log.info('Gallery watcher not started because configured storage is unavailable', {
        reason: storageState.reason
      });
      return;
    }

    this.watcher = chokidar.watch(appConfig.galleryRoot, {
      ignoreInitial: true
    });

    this.watcher.on('all', async (eventName: string, absolutePath: string) => {
      const relativePath = getRelativeGalleryPath(appConfig.galleryRoot, absolutePath);
      if (!relativePath || isHiddenPath(relativePath)) {
        return;
      }

      if (eventName === 'addDir' || eventName === 'unlinkDir') {
        this.fullRescanRequested = true;
      } else {
        this.pendingPaths.add(relativePath);
      }

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        const queued = [...this.pendingPaths];
        this.pendingPaths.clear();
        this.debounceTimer = null;

        if (this.fullRescanRequested) {
          this.fullRescanRequested = false;
          await scannerService.scanAll('watcher');
          return;
        }

        if (queued.length > 0) {
          await scannerService.scanChangedPaths(queued, 'watcher');
        }
      }, 700);
    });

    log.info('Gallery watcher started');
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      log.info('Gallery watcher stopped');
    }
  }
}

export const watcherService = new WatcherService();
