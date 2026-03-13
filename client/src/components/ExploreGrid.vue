<template>
  <section class="explore-grid" aria-label="Explore posts">
    <RouterLink v-for="(item, index) in items" :key="item.id" custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
      <a
        :href="href"
        class="explore-grid__item"
        :class="getTileClass(index)"
        @click="handleImageNavigation($event, navigate)"
      >
        <ResilientImage :src="item.thumbnailUrl" :alt="item.filename" loading="lazy" :retry-while="appStore.isScanning" />
      </a>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

import { useAppStore } from '../stores/app';
import type { FeedItem } from '../types/api';
import ResilientImage from './ResilientImage.vue';

defineProps<{
  items: FeedItem[];
}>();

const FEATURE_INDEXES = new Set([2, 8, 13]);

const appStore = useAppStore();
const route = useRoute();

function getTileClass(index: number): string {
  return FEATURE_INDEXES.has(index % 15) ? 'explore-grid__item--feature' : '';
}

function handleImageNavigation(event: MouseEvent, navigate: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  appStore.setImageModalBackground(route.fullPath);
  navigate();
}
</script>

<style scoped>
.explore-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: 0.2rem;
}

.explore-grid__item {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}

.explore-grid__item :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.explore-grid__item:hover :deep(img) {
  transform: scale(1.02);
  opacity: 0.92;
}

@media (min-width: 1080px) {
  .explore-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .explore-grid__item--feature {
    grid-column: span 2;
    grid-row: span 2;
  }
}

@media (max-width: 699px) {
  .explore-grid {
    gap: 0.15rem;
  }
}
</style>
