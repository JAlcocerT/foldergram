import { defineStore } from 'pinia';

import { fetchStats } from '../api/gallery';
import type { AppStats } from '../types/api';

interface AppState {
  stats: AppStats | null;
  loadingStats: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  lastOpenedFolderSlug: string | null;
  imageModalBackgroundPath: string | null;
  statsPollFailures: number;
  statsPollTimer: ReturnType<typeof setInterval> | null;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    stats: null,
    loadingStats: false,
    error: null,
    theme: 'light',
    lastOpenedFolderSlug: null,
    imageModalBackgroundPath: null,
    statsPollFailures: 0,
    statsPollTimer: null
  }),
  getters: {
    isLibraryUnavailable: (state) => state.stats?.storage.available === false,
    libraryUnavailableReason: (state) => state.stats?.storage.reason ?? 'Configured library storage is unavailable.',
    isLibraryRebuildRequired: (state) => state.stats?.libraryIndex.rebuildRequired === true,
    isScanning: (state) => state.stats?.scan.isScanning === true,
    hasCompletedScan: (state) => state.stats?.scan.lastCompletedScan !== null,
    isInitialScan: (state) => state.stats?.scan.isScanning === true && state.stats?.scan.lastCompletedScan === null
  },
  actions: {
    initializeTheme() {
      const savedTheme = window.localStorage.getItem('insta-local-theme');
      const preferredTheme =
        savedTheme === 'light' || savedTheme === 'dark'
          ? savedTheme
          : window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';

      this.setTheme(preferredTheme);
    },

    initializeLastOpenedFolder() {
      const savedSlug = window.localStorage.getItem('insta-local-last-opened-folder');
      this.lastOpenedFolderSlug = savedSlug && savedSlug.length > 0 ? savedSlug : null;
    },

    setTheme(theme: 'light' | 'dark') {
      this.theme = theme;
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem('insta-local-theme', theme);
    },

    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    },

    recordOpenedFolder(slug: string) {
      this.lastOpenedFolderSlug = slug;
      window.localStorage.setItem('insta-local-last-opened-folder', slug);
    },

    setImageModalBackground(path: string) {
      this.imageModalBackgroundPath = path;
    },

    clearImageModalBackground() {
      this.imageModalBackgroundPath = null;
    },

    markScanStatusUnavailable() {
      if (!this.stats) {
        return;
      }

      this.stats = {
        ...this.stats,
        scan: {
          ...this.stats.scan,
          isScanning: false,
          scanReason: null,
          phase: 'idle',
          startedAt: null,
          runId: null,
          currentFolder: null
        }
      };
    },

    startStatsPolling() {
      if (this.statsPollTimer) {
        return;
      }

      this.statsPollTimer = setInterval(() => {
        if (document.visibilityState === 'hidden') {
          return;
        }

        if (!this.stats?.scan.isScanning) {
          this.stopStatsPolling();
          return;
        }

        void this.fetchStats({ background: true });
      }, 2500);
    },

    stopStatsPolling() {
      if (this.statsPollTimer) {
        clearInterval(this.statsPollTimer);
        this.statsPollTimer = null;
      }

      this.statsPollFailures = 0;
    },

    removeIndexedImage(removedFolderCount = 0) {
      if (!this.stats) {
        return;
      }

      this.stats.folders = Math.max(0, this.stats.folders - removedFolderCount);
      this.stats.indexedImages = Math.max(0, this.stats.indexedImages - 1);
      this.stats.deletedImages += 1;
    },

    removeFolder(deletedImageCount: number) {
      if (!this.stats) {
        return;
      }

      this.stats.folders = Math.max(0, this.stats.folders - 1);
      this.stats.indexedImages = Math.max(0, this.stats.indexedImages - deletedImageCount);
      this.stats.deletedImages += deletedImageCount;
    },

    async fetchStats(options: { background?: boolean } = {}) {
      if (!options.background) {
        this.loadingStats = true;
        this.error = null;
      }

      try {
        this.stats = await fetchStats();
        this.statsPollFailures = 0;

        if (options.background && this.error) {
          this.error = null;
        }

        if (this.stats.scan.isScanning) {
          this.startStatsPolling();
        } else {
          this.stopStatsPolling();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load app stats';

        if (options.background) {
          this.statsPollFailures += 1;

          if (this.statsPollFailures >= 3) {
            this.stopStatsPolling();
            this.markScanStatusUnavailable();
            this.error = 'Lost connection while refreshing scan status.';
          }
        } else {
          this.error = message;
        }
      } finally {
        if (!options.background) {
          this.loadingStats = false;
        }
      }
    }
  }
});
