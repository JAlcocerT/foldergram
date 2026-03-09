import { defineStore } from 'pinia';

import { fetchStats } from '../api/gallery';
import type { AppStats } from '../types/api';

interface AppState {
  stats: AppStats | null;
  loadingStats: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  imageModalBackgroundPath: string | null;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    stats: null,
    loadingStats: false,
    error: null,
    theme: 'light',
    imageModalBackgroundPath: null
  }),
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

    setTheme(theme: 'light' | 'dark') {
      this.theme = theme;
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem('insta-local-theme', theme);
    },

    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    },

    setImageModalBackground(path: string) {
      this.imageModalBackgroundPath = path;
    },

    clearImageModalBackground() {
      this.imageModalBackgroundPath = null;
    },

    removeIndexedImage() {
      if (!this.stats) {
        return;
      }

      this.stats.indexedImages = Math.max(0, this.stats.indexedImages - 1);
      this.stats.deletedImages += 1;
    },

    async fetchStats() {
      this.loadingStats = true;
      this.error = null;

      try {
        this.stats = await fetchStats();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to load app stats';
      } finally {
        this.loadingStats = false;
      }
    }
  }
});
