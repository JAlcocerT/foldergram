import { defineStore } from 'pinia';

import { fetchProfileImages, fetchProfiles } from '../api/gallery';
import type { FeedItem, ProfileSummary } from '../types/api';

interface ProfilesState {
  items: ProfileSummary[];
  loadingList: boolean;
  pendingListRefresh: boolean;
  listError: string | null;
  currentProfile: ProfileSummary | null;
  currentImages: FeedItem[];
  currentPage: number;
  currentLimit: number;
  currentHasMore: boolean;
  loadingProfile: boolean;
  profileError: string | null;
}

export const useProfilesStore = defineStore('profiles', {
  state: (): ProfilesState => ({
    items: [],
    loadingList: false,
    pendingListRefresh: false,
    listError: null,
    currentProfile: null,
    currentImages: [],
    currentPage: 1,
    currentLimit: 24,
    currentHasMore: true,
    loadingProfile: false,
    profileError: null
  }),
  actions: {
    removeImage(imageId: number, profileSlug: string) {
      this.items = this.items.map((profile) =>
        profile.slug === profileSlug
          ? {
              ...profile,
              imageCount: Math.max(0, profile.imageCount - 1)
            }
          : profile
      );

      if (this.currentProfile?.slug === profileSlug) {
        this.currentProfile = {
          ...this.currentProfile,
          imageCount: Math.max(0, this.currentProfile.imageCount - 1)
        };
        this.currentImages = this.currentImages.filter((item) => item.id !== imageId);
      }
    },

    async fetchProfiles(force = false) {
      if (this.loadingList) {
        this.pendingListRefresh = this.pendingListRefresh || force;
        return;
      }

      if (!force && this.items.length > 0) {
        return;
      }

      this.loadingList = true;
      this.listError = null;

      try {
        this.items = await fetchProfiles();
      } catch (error) {
        this.listError = error instanceof Error ? error.message : 'Unable to load profiles';
      } finally {
        this.loadingList = false;
      }

      if (this.pendingListRefresh) {
        this.pendingListRefresh = false;
        await this.fetchProfiles(true);
      }
    },

    async loadProfile(slug: string, reset = true) {
      if (this.loadingProfile) {
        return;
      }

      if (reset) {
        this.currentProfile = null;
        this.currentImages = [];
        this.currentPage = 1;
        this.currentHasMore = true;
      }

      this.loadingProfile = true;
      this.profileError = null;

      try {
        const payload = await fetchProfileImages(slug, this.currentPage, this.currentLimit);
        this.currentProfile = payload.profile;
        this.currentImages.push(...payload.items);
        this.currentPage += 1;
        this.currentHasMore = payload.hasMore;
      } catch (error) {
        this.currentProfile = null;
        this.profileError = error instanceof Error ? error.message : 'Unable to load profile';
      } finally {
        this.loadingProfile = false;
      }
    }
  }
});
