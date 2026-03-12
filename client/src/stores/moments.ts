import { defineStore } from 'pinia';

import { fetchMomentFeed, fetchMoments } from '../api/gallery';
import type { FeedItem, FeedRailKind, MomentCapsule } from '../types/api';

interface MomentsState {
  railKind: FeedRailKind;
  railTitle: string;
  railDescription: string;
  railSingularLabel: string;
  items: MomentCapsule[];
  loadingList: boolean;
  listError: string | null;
  currentMoment: MomentCapsule | null;
  currentImages: FeedItem[];
  currentPage: number;
  currentLimit: number;
  currentHasMore: boolean;
  loadingMoment: boolean;
  momentError: string | null;
}

export const useMomentsStore = defineStore('moments', {
  state: (): MomentsState => ({
    railKind: 'moments',
    railTitle: 'Moments',
    railDescription: 'Memory capsules from your library.',
    railSingularLabel: 'Moment',
    items: [],
    loadingList: false,
    listError: null,
    currentMoment: null,
    currentImages: [],
    currentPage: 1,
    currentLimit: 18,
    currentHasMore: true,
    loadingMoment: false,
    momentError: null
  }),
  actions: {
    removeImage(imageId: number) {
      if (this.currentMoment) {
        const existedInMoment = this.currentImages.some((item) => item.id === imageId);
        this.currentImages = this.currentImages.filter((item) => item.id !== imageId);

        if (existedInMoment) {
          const nextCount = Math.max(0, this.currentMoment.imageCount - 1);
          this.currentMoment = nextCount > 0 ? { ...this.currentMoment, imageCount: nextCount } : null;
          this.currentHasMore = nextCount > this.currentImages.length;
        }
      }
    },

    resetForRebuild() {
      this.railKind = 'moments';
      this.railTitle = 'Moments';
      this.railDescription = 'Memory capsules from your library.';
      this.railSingularLabel = 'Moment';
      this.items = [];
      this.loadingList = false;
      this.listError = null;
      this.currentMoment = null;
      this.currentImages = [];
      this.currentPage = 1;
      this.currentHasMore = true;
      this.loadingMoment = false;
      this.momentError = null;
    },

    async fetchMoments(force = false) {
      if (this.loadingList) {
        return;
      }

      if (!force && this.items.length > 0) {
        return;
      }

      this.loadingList = true;
      this.listError = null;

      try {
        const payload = await fetchMoments();
        this.railKind = payload.railKind;
        this.railTitle = payload.railTitle;
        this.railDescription = payload.railDescription;
        this.railSingularLabel = payload.railSingularLabel;
        this.items = payload.items;
      } catch (error) {
        this.listError = error instanceof Error ? error.message : 'Unable to load the home rail';
      } finally {
        this.loadingList = false;
      }
    },

    async loadMoment(id: string, reset = true) {
      if (this.loadingMoment) {
        return;
      }

      if (reset) {
        this.currentMoment = null;
        this.currentImages = [];
        this.currentPage = 1;
        this.currentHasMore = true;
      }

      this.loadingMoment = true;
      this.momentError = null;

      try {
        const payload = await fetchMomentFeed(id, this.currentPage, this.currentLimit);
        this.railKind = payload.railKind;
        this.railTitle = payload.railTitle;
        this.railDescription = payload.railDescription;
        this.railSingularLabel = payload.railSingularLabel;
        this.currentMoment = payload.moment;
        this.currentImages.push(...payload.items);
        this.currentPage += 1;
        this.currentHasMore = payload.hasMore;
      } catch (error) {
        this.currentMoment = null;
        this.momentError = error instanceof Error ? error.message : 'Unable to load this feed capsule';
      } finally {
        this.loadingMoment = false;
      }
    }
  }
});
