import { defineStore } from 'pinia';

import { fetchFeed } from '../api/gallery';
import type { FeedItem, FeedMode } from '../types/api';

const FEED_MODE_STORAGE_KEY = 'insta-local-home-feed-mode';
const RANDOM_SEED_STORAGE_KEY = 'insta-local-random-feed-seed';

interface FeedState {
  mode: FeedMode;
  items: FeedItem[];
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  randomSeed: number | null;
}

function createRandomSeed(): number {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    return cryptoObject.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 2_147_483_647);
  }

  return Math.floor(Math.random() * 2_147_483_647);
}

export const useFeedStore = defineStore('feed', {
  state: (): FeedState => ({
    mode: 'recent',
    items: [],
    page: 1,
    limit: 18,
    hasMore: true,
    loading: false,
    error: null,
    initialized: false,
    randomSeed: null
  }),
  actions: {
    initializeMode() {
      const savedMode = window.sessionStorage.getItem(FEED_MODE_STORAGE_KEY);
      if (savedMode === 'recent' || savedMode === 'rediscover' || savedMode === 'random') {
        this.mode = savedMode;
      }

      const savedSeed = Number(window.sessionStorage.getItem(RANDOM_SEED_STORAGE_KEY));
      this.randomSeed = Number.isFinite(savedSeed) && savedSeed >= 0 ? savedSeed : null;
    },

    persistMode() {
      window.sessionStorage.setItem(FEED_MODE_STORAGE_KEY, this.mode);
    },

    ensureRandomSeed() {
      if (this.randomSeed !== null) {
        return this.randomSeed;
      }

      this.randomSeed = createRandomSeed();
      window.sessionStorage.setItem(RANDOM_SEED_STORAGE_KEY, String(this.randomSeed));
      return this.randomSeed;
    },

    async setMode(mode: FeedMode) {
      if (this.mode === mode && this.initialized) {
        return;
      }

      this.mode = mode;
      this.persistMode();
      await this.loadInitial(true);
    },

    removeImage(id: number) {
      this.items = this.items.filter((item) => item.id !== id);
    },

    removeFolderItems(folderSlug: string) {
      this.items = this.items.filter((item) => item.folderSlug !== folderSlug);
    },

    resetForRebuild() {
      this.items = [];
      this.page = 1;
      this.hasMore = true;
      this.loading = false;
      this.error = null;
      this.initialized = false;
    },

    async loadInitial(force = false) {
      if (this.loading) {
        return;
      }

      if (this.initialized && !force) {
        return;
      }

      this.items = [];
      this.page = 1;
      this.hasMore = true;
      this.initialized = false;
      await this.loadMore();
    },

    async loadMore() {
      if (this.loading || !this.hasMore) {
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const seed = this.mode === 'random' ? this.ensureRandomSeed() : undefined;
        const payload = await fetchFeed(this.page, this.limit, this.mode, seed);
        this.items.push(...payload.items);
        this.page += 1;
        this.hasMore = payload.hasMore;
        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to load feed';
      } finally {
        this.loading = false;
      }
    }
  }
});
