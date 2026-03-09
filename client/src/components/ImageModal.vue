<template>
  <section v-if="image" :class="['viewer', { 'viewer--modal': isModal }]">
    <button v-if="isModal" class="viewer__close" type="button" aria-label="Close image" @click="$emit('close')">
      <svg viewBox="0 0 24 24" role="presentation">
        <path
          d="m7 7 10 10M17 7 7 17"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </button>
    <RouterLink v-if="image.previousImageId" class="viewer__nav viewer__nav--prev" :to="`/image/${image.previousImageId}`" aria-label="Previous image">
      <svg viewBox="0 0 24 24" role="presentation">
        <path
          d="m14.5 6.5-5 5 5 5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </RouterLink>
    <RouterLink v-if="image.nextImageId" class="viewer__nav viewer__nav--next" :to="`/image/${image.nextImageId}`" aria-label="Next image">
      <svg viewBox="0 0 24 24" role="presentation">
        <path
          d="m9.5 6.5 5 5-5 5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </RouterLink>
    <div class="viewer__card">
      <div class="viewer__media">
        <img :src="image.previewUrl" :alt="image.filename" />
      </div>
      <aside class="viewer__sidebar">
        <div class="viewer__header">
          <RouterLink class="viewer__profile" :to="{ name: 'profile', params: { slug: image.profileSlug } }">
            <Avatar :name="image.profileName" :src="profileAvatar" />
            <div>
              <h2>{{ image.profileSlug }}</h2>
              <p>{{ image.profileName }}</p>
            </div>
          </RouterLink>
          <span class="viewer__timestamp">{{ formattedDate }}</span>
        </div>
        <div class="viewer__description">
          <p>
            <strong>{{ image.profileSlug }}</strong>
            {{ readableFilename }}
          </p>
          <p>{{ image.relativePath }}</p>
        </div>
        <dl class="viewer__meta">
          <div>
            <dt>Dimensions</dt>
            <dd>{{ image.width }} × {{ image.height }}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{{ image.mimeType }}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{{ fileSize }}</dd>
          </div>
        </dl>
        <div class="viewer__actions">
          <button
            class="viewer__action-icon"
            :class="{ 'viewer__action-icon--active': likesStore.isLiked(image.id) }"
            type="button"
            :aria-label="likesStore.isLiked(image.id) ? 'Unlike post' : 'Like post'"
            :aria-pressed="likesStore.isLiked(image.id)"
            :disabled="likesStore.isPending(image.id)"
            @click="likesStore.toggleLike(image)"
          >
            <svg viewBox="0 0 24 24" role="presentation">
              <path
                d="m12 20.25-.7-.64C6.35 15.09 4 12.96 4 9.96A4.21 4.21 0 0 1 8.28 5.5c1.44 0 2.83.67 3.72 1.73.89-1.06 2.28-1.73 3.72-1.73A4.21 4.21 0 0 1 20 9.96c0 3-2.35 5.13-7.3 9.65Z"
                :fill="likesStore.isLiked(image.id) ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
              />
            </svg>
          </button>
          <div class="viewer__action-group">
            <a class="viewer__action-icon" :href="image.originalUrl" target="_blank" rel="noreferrer" aria-label="Open original image">
              <svg viewBox="0 0 24 24" role="presentation">
                <path
                  d="M14 5h5v5m0-5-7.5 7.5M10 7H7.5A2.5 2.5 0 0 0 5 9.5v7A2.5 2.5 0 0 0 7.5 19h7a2.5 2.5 0 0 0 2.5-2.5V14"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
            </a>
            <button
              class="viewer__action-icon viewer__action-icon--danger"
              type="button"
              aria-label="Delete image"
              :disabled="deleting"
              @click="$emit('delete')"
            >
              <svg viewBox="0 0 24 24" role="presentation">
                <path
                  d="M9 4.75h6m-8 3h10m-8.5 0v10a1.25 1.25 0 0 0 1.25 1.25h4.5A1.25 1.25 0 0 0 15.5 17.75v-10m-4 3v5m4-5v5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import type { ImageDetail, ProfileSummary } from '../types/api';
import { useLikesStore } from '../stores/likes';
import Avatar from './Avatar.vue';

const props = defineProps<{
  image: ImageDetail | null;
  profile?: ProfileSummary | null;
  isModal?: boolean;
  deleting?: boolean;
}>();

defineEmits<{
  close: [];
  delete: [];
}>();

const likesStore = useLikesStore();

const fileSize = computed(() => {
  if (!props.image) {
    return '';
  }

  const megabytes = props.image.fileSize / (1024 * 1024);
  return `${megabytes.toFixed(2)} MB`;
});

const profileAvatar = computed(() => props.profile?.avatarUrl ?? null);
const readableFilename = computed(() =>
  props.image
    ? props.image.filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
);
const formattedDate = computed(() =>
  props.image
    ? new Date(props.image.sortTimestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : ''
);
</script>
