import { defineStore } from 'pinia';

import { fetchFeed } from '../api/gallery';
import type { FeedItem } from '../types/api';

interface ExploreState {
  items: FeedItem[];
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  randomSeed: number | null;
  recentSearchSlugs: string[];
  recentSearchesInitialized: boolean;
}

const RECENT_SEARCHES_STORAGE_KEY = 'foldergram-recent-searches';
const RECENT_SEARCH_LIMIT = 12;

function createRandomSeed(): number {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    return cryptoObject.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 2_147_483_647);
  }

  return Math.floor(Math.random() * 2_147_483_647);
}

function parseStoredRecentSearchSlugs(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry, index, items) => entry.length > 0 && items.indexOf(entry) === index)
      .slice(0, RECENT_SEARCH_LIMIT);
  } catch {
    return [];
  }
}

export const useExploreStore = defineStore('explore', {
  state: (): ExploreState => ({
    items: [],
    page: 1,
    limit: 30,
    hasMore: true,
    loading: false,
    error: null,
    initialized: false,
    randomSeed: null,
    recentSearchSlugs: [],
    recentSearchesInitialized: false
  }),
  actions: {
    reset() {
      this.items = [];
      this.page = 1;
      this.hasMore = true;
      this.loading = false;
      this.error = null;
      this.initialized = false;
      this.randomSeed = null;
    },

    initializeRecentSearches() {
      if (this.recentSearchesInitialized) {
        return;
      }

      this.recentSearchSlugs = parseStoredRecentSearchSlugs(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY));
      this.recentSearchesInitialized = true;
    },

    persistRecentSearches() {
      window.localStorage.setItem(
        RECENT_SEARCHES_STORAGE_KEY,
        JSON.stringify(this.recentSearchSlugs.slice(0, RECENT_SEARCH_LIMIT))
      );
    },

    ensureRandomSeed() {
      if (this.randomSeed !== null) {
        return this.randomSeed;
      }

      this.randomSeed = createRandomSeed();
      return this.randomSeed;
    },

    recordRecentSearch(slug: string) {
      const normalizedSlug = slug.trim();
      if (normalizedSlug.length === 0) {
        return;
      }

      this.initializeRecentSearches();
      this.recentSearchSlugs = [
        normalizedSlug,
        ...this.recentSearchSlugs.filter((entry) => entry !== normalizedSlug)
      ].slice(0, RECENT_SEARCH_LIMIT);
      this.persistRecentSearches();
    },

    clearRecentSearches() {
      this.initializeRecentSearches();
      this.recentSearchSlugs = [];
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
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
      this.error = null;
      this.initialized = false;
      this.randomSeed = force ? createRandomSeed() : this.randomSeed;
      await this.loadMore();
    },

    async loadMore() {
      if (this.loading || !this.hasMore) {
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const payload = await fetchFeed(this.page, this.limit, 'random', this.ensureRandomSeed());
        this.items.push(...payload.items);
        this.page += 1;
        this.hasMore = payload.hasMore;
        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to load explore feed';
      } finally {
        this.loading = false;
      }
    }
  }
});
