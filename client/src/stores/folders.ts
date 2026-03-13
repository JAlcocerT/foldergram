import { defineStore } from 'pinia';

import { fetchFolderImages, fetchFolders } from '../api/gallery';
import type { FeedItem, FolderSummary } from '../types/api';

type FolderMediaFilter = 'all' | 'video';

interface FoldersState {
  items: FolderSummary[];
  loadingList: boolean;
  pendingListRefresh: boolean;
  listError: string | null;
  currentFolder: FolderSummary | null;
  currentImages: FeedItem[];
  currentFilter: FolderMediaFilter;
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
    currentFilter: 'all',
    currentPage: 1,
    currentLimit: 24,
    currentHasMore: true,
    loadingFolder: false,
    folderError: null
  }),
  actions: {
    removeImage(imageId: number, folderSlug: string, mediaType: FeedItem['mediaType'] = 'image') {
      let removedFolder = false;

      this.items = this.items.flatMap((folder) => {
        if (folder.slug !== folderSlug) {
          return [folder];
        }

        const nextImageCount = Math.max(0, folder.imageCount - 1);
        if (nextImageCount === 0) {
          removedFolder = true;
          return [];
        }

        return [
          {
            ...folder,
            imageCount: nextImageCount,
            videoCount: mediaType === 'video' ? Math.max(0, folder.videoCount - 1) : folder.videoCount
          }
        ];
      });

      if (this.currentFolder?.slug === folderSlug) {
        if (this.currentFilter === 'all' || mediaType === 'video') {
          this.currentImages = this.currentImages.filter((item) => item.id !== imageId);
        }

        const nextImageCount = Math.max(0, this.currentFolder.imageCount - 1);
        if (nextImageCount === 0) {
          this.currentFolder = null;
          this.currentPage = 1;
          this.currentHasMore = false;
        } else {
          this.currentFolder = {
            ...this.currentFolder,
            imageCount: nextImageCount,
            videoCount: mediaType === 'video' ? Math.max(0, this.currentFolder.videoCount - 1) : this.currentFolder.videoCount
          };
        }
      }

      return removedFolder;
    },

    removeFolder(slug: string) {
      this.items = this.items.filter((folder) => folder.slug !== slug);

      if (this.currentFolder?.slug === slug) {
        this.currentFolder = null;
        this.currentImages = [];
        this.currentPage = 1;
        this.currentHasMore = false;
      }
    },

    resetForRebuild() {
      this.items = [];
      this.loadingList = false;
      this.pendingListRefresh = false;
      this.listError = null;
      this.currentFolder = null;
      this.currentImages = [];
      this.currentFilter = 'all';
      this.currentPage = 1;
      this.currentHasMore = true;
      this.loadingFolder = false;
      this.folderError = null;
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

    async loadFolder(slug: string, reset = true, mediaType?: FeedItem['mediaType']) {
      if (this.loadingFolder) {
        return;
      }

      const nextFilter: FolderMediaFilter = mediaType === 'video' ? 'video' : 'all';
      const filterChanged = this.currentFilter !== nextFilter;

      if (reset || filterChanged) {
        this.currentFolder = null;
        this.currentImages = [];
        this.currentFilter = nextFilter;
        this.currentPage = 1;
        this.currentHasMore = true;
      }

      this.loadingFolder = true;
      this.folderError = null;

      try {
        const payload = await fetchFolderImages(slug, this.currentPage, this.currentLimit, mediaType);
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
