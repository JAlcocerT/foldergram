import { defineStore } from 'pinia';

import { fetchFeed } from '../api/gallery';
import type { FeedItem } from '../types/api';

interface FeedState {
  items: FeedItem[];
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export const useFeedStore = defineStore('feed', {
  state: (): FeedState => ({
    items: [],
    page: 1,
    limit: 18,
    hasMore: true,
    loading: false,
    error: null,
    initialized: false
  }),
  actions: {
    removeImage(id: number) {
      this.items = this.items.filter((item) => item.id !== id);
    },

    async loadInitial(force = false) {
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
        const payload = await fetchFeed(this.page, this.limit);
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
