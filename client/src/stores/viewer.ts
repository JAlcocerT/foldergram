import { defineStore } from 'pinia';

import { deleteImage, fetchImage } from '../api/gallery';
import type { DeleteImageResult, ImageDetail } from '../types/api';

interface ViewerState {
  image: ImageDetail | null;
  loading: boolean;
  deleting: boolean;
  error: string | null;
}

export const useViewerStore = defineStore('viewer', {
  state: (): ViewerState => ({
    image: null,
    loading: false,
    deleting: false,
    error: null
  }),
  actions: {
    reset() {
      this.image = null;
      this.loading = false;
      this.deleting = false;
      this.error = null;
    },

    async loadImage(id: number, mediaType?: 'image' | 'video') {
      this.loading = true;
      this.error = null;
      this.image = null;

      try {
        this.image = await fetchImage(id, mediaType);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to load post';
      } finally {
        this.loading = false;
      }
    },

    async deleteImage(id: number): Promise<DeleteImageResult> {
      this.deleting = true;
      this.error = null;

      try {
        const payload = await deleteImage(id);
        if (this.image?.id === id) {
          this.image = null;
        }

        return payload;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to delete post';
        throw error;
      } finally {
        this.deleting = false;
      }
    }
  }
});
