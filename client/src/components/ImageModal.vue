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
        <ResilientImage :src="image.previewUrl" :alt="image.filename" loading="eager" :retry-while="appStore.isScanning" />
      </div>
      <aside class="viewer__sidebar">
        <div class="viewer__header">
          <RouterLink class="viewer__profile" :to="{ name: 'profile', params: { slug: image.profileSlug } }" aria-label="Open folder">
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
            <svg viewBox="0 0 48 48" role="presentation">
              <path
                d="M7.923 10.155a10.42 10.42 0 0 1 13.806.684l2.272 2.223l2.266-2.22a10.42 10.42 0 0 1 13.809-.687c4.85 3.887 5.242 11.13.837 15.516l-16.03 15.964a1.25 1.25 0 0 1-1.764 0L7.087 25.67c-4.405-4.386-4.015-11.628.836-15.516zm12.057 2.47a7.92 7.92 0 0 0-10.494-.52C5.8 15.06 5.503 20.565 8.851 23.9L24 38.986l15.148-15.087c3.348-3.334 3.05-8.839-.636-11.793a7.921 7.921 0 0 0-10.496.522l-3.141 3.077a1.25 1.25 0 0 1-1.75 0l-3.146-3.08z"
                fill="currentColor"
              />
            </svg>
          </button>
          <div class="viewer__action-group">
            <a class="viewer__action-icon" :href="image.originalUrl" target="_blank" rel="noreferrer" aria-label="Open original image">
              <svg viewBox="0 0 24 24" role="presentation">
                <path
                  d="M11 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                />
                <path
                  d="M10 14L20 4"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                />
                <path
                  d="M15 4h5v5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
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
              <svg viewBox="0 0 32 32" role="presentation">
                <path d="M12 12h2v12h-2z" fill="currentColor" />
                <path d="M18 12h2v12h-2z" fill="currentColor" />
                <path d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20z" fill="currentColor" />
                <path d="M12 2h8v2h-8z" fill="currentColor" />
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
import { useAppStore } from '../stores/app';
import { useLikesStore } from '../stores/likes';
import Avatar from './Avatar.vue';
import ResilientImage from './ResilientImage.vue';

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
const appStore = useAppStore();

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
