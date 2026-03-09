import { defineStore } from 'pinia';

import { fetchLikes, likeImage, unlikeImage } from '../api/gallery';
import type { FeedItem } from '../types/api';

interface LikesState {
  items: FeedItem[];
  likedIds: number[];
  pendingIds: number[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export const useLikesStore = defineStore('likes', {
  state: (): LikesState => ({
    items: [],
    likedIds: [],
    pendingIds: [],
    loading: false,
    error: null,
    initialized: false
  }),
  getters: {
    isLiked: (state) => (id: number) => state.likedIds.includes(id),
    isPending: (state) => (id: number) => state.pendingIds.includes(id)
  },
  actions: {
    syncFromItems(items: FeedItem[]) {
      this.items = items;
      this.likedIds = items.map((item) => item.id);
    },

    async initialize(force = false) {
      if ((this.initialized && !force) || this.loading) {
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const payload = await fetchLikes();
        this.syncFromItems(payload.items);
        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to load likes';
      } finally {
        this.loading = false;
      }
    },

    async toggleLike(item: FeedItem) {
      if (this.pendingIds.includes(item.id)) {
        return;
      }

      const wasLiked = this.likedIds.includes(item.id);
      this.pendingIds.push(item.id);
      this.error = null;

      if (wasLiked) {
        this.likedIds = this.likedIds.filter((id) => id !== item.id);
        this.items = this.items.filter((entry) => entry.id !== item.id);
      } else {
        this.likedIds = [item.id, ...this.likedIds.filter((id) => id !== item.id)];
        this.items = [item, ...this.items.filter((entry) => entry.id !== item.id)];
      }

      try {
        if (wasLiked) {
          await unlikeImage(item.id);
        } else {
          await likeImage(item.id);
        }
      } catch (error) {
        if (wasLiked) {
          this.likedIds = [item.id, ...this.likedIds.filter((id) => id !== item.id)];
          this.items = [item, ...this.items.filter((entry) => entry.id !== item.id)];
        } else {
          this.likedIds = this.likedIds.filter((id) => id !== item.id);
          this.items = this.items.filter((entry) => entry.id !== item.id);
        }
      } finally {
        this.pendingIds = this.pendingIds.filter((id) => id !== item.id);
      }
    },

    removeImage(id: number) {
      this.likedIds = this.likedIds.filter((entry) => entry !== id);
      this.items = this.items.filter((entry) => entry.id !== id);
      this.pendingIds = this.pendingIds.filter((entry) => entry !== id);
    }
  }
});
