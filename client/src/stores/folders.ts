import { defineStore } from 'pinia';

import { fetchFolderImages, fetchFolders } from '../api/gallery';
import type { FeedItem, FolderSummary } from '../types/api';

interface FoldersState {
  items: FolderSummary[];
  loadingList: boolean;
  pendingListRefresh: boolean;
  listError: string | null;
  currentFolder: FolderSummary | null;
  currentImages: FeedItem[];
  currentPage: number;
  currentLimit: number;
  currentHasMore: boolean;
  loadingFolder: boolean;
  folderError: string | null;
}

export const useFoldersStore = defineStore('folders', {
  state: (): FoldersState => ({
    items: [],
    loadingList: false,
    pendingListRefresh: false,
    listError: null,
    currentFolder: null,
    currentImages: [],
    currentPage: 1,
    currentLimit: 24,
    currentHasMore: true,
    loadingFolder: false,
    folderError: null
  }),
  actions: {
    removeImage(imageId: number, folderSlug: string) {
      this.items = this.items.map((folder) =>
        folder.slug === folderSlug
          ? {
              ...folder,
              imageCount: Math.max(0, folder.imageCount - 1)
            }
          : folder
      );

      if (this.currentFolder?.slug === folderSlug) {
        this.currentFolder = {
          ...this.currentFolder,
          imageCount: Math.max(0, this.currentFolder.imageCount - 1)
        };
        this.currentImages = this.currentImages.filter((item) => item.id !== imageId);
      }
    },

    removeFolder(slug: string) {
      this.items = this.items.filter((folder) => folder.slug !== slug);

      if (this.currentFolder?.slug === slug) {
        this.currentFolder = null;
        this.currentImages = [];
      }
    },

    async fetchFolders(force = false) {
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
        this.items = await fetchFolders();
      } catch (error) {
        this.listError = error instanceof Error ? error.message : 'Unable to load folders';
      } finally {
        this.loadingList = false;
      }

      if (this.pendingListRefresh) {
        this.pendingListRefresh = false;
        await this.fetchFolders(true);
      }
    },

    async loadFolder(slug: string, reset = true) {
      if (this.loadingFolder) {
        return;
      }

      if (reset) {
        this.currentFolder = null;
        this.currentImages = [];
        this.currentPage = 1;
        this.currentHasMore = true;
      }

      this.loadingFolder = true;
      this.folderError = null;

      try {
        const payload = await fetchFolderImages(slug, this.currentPage, this.currentLimit);
        this.currentFolder = payload.folder;
        this.currentImages.push(...payload.items);
        this.currentPage += 1;
        this.currentHasMore = payload.hasMore;
      } catch (error) {
        this.currentFolder = null;
        this.folderError = error instanceof Error ? error.message : 'Unable to load folder';
      } finally {
        this.loadingFolder = false;
      }
    }
  }
});
