<template>
  <section class="grid grid-cols-3 gap-[0.2rem]">
    <RouterLink v-for="item in items" :key="item.id" custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
      <a :href="href" class="folder-grid__item aspect-square overflow-hidden bg-surface-alt" @click="handleImageNavigation($event, navigate)">
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
