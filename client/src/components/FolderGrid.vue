<template>
  <section class="grid gap-[0.2rem]" :class="variant === 'portrait' ? 'grid-cols-4' : 'grid-cols-3'">
    <RouterLink v-for="item in items" :key="item.id" custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
      <a
        :href="href"
        class="folder-grid__item relative overflow-hidden bg-surface-alt"
        :class="variant === 'portrait' ? 'aspect-[9/16]' : 'aspect-square'"
        @click="handleImageNavigation($event, navigate)"
      >
        <ResilientImage :src="item.thumbnailUrl" :alt="item.filename" loading="lazy" :retry-while="appStore.isScanning" />
        <div v-if="item.mediaType === 'video'" class="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-2 text-white pointer-events-none bg-[linear-gradient(180deg,rgba(10,14,24,0.72)_0%,rgba(10,14,24,0)_100%)]">
          <span class="i-fluent-play-circle-24-filled w-[1.15rem] h-[1.15rem] text-white" aria-hidden="true" />
          <span v-if="item.durationMs" class="rounded-full bg-black/55 px-[0.42rem] py-[0.12rem] text-[0.7rem] font-semibold">
            {{ formatMediaDuration(item.durationMs) }}
          </span>
        </div>
      </a>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

import { useAppStore } from '../stores/app';
import type { FeedItem } from '../types/api';
import { formatMediaDuration } from '../utils/media';
import ResilientImage from './ResilientImage.vue';

withDefaults(
  defineProps<{
    items: FeedItem[];
    variant?: 'square' | 'portrait';
  }>(),
  {
    variant: 'square'
  }
);

const appStore = useAppStore();
const route = useRoute();

function handleImageNavigation(event: MouseEvent, navigate: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  appStore.setImageModalBackground(route.fullPath);
  navigate();
}
</script>
