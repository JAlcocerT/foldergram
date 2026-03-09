<template>
  <section class="profile-grid">
    <RouterLink v-for="item in items" :key="item.id" custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
      <a :href="href" class="profile-grid__item" @click="handleImageNavigation($event, navigate)">
        <img :src="item.thumbnailUrl" :alt="item.filename" loading="lazy" />
      </a>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

import { useAppStore } from '../stores/app';
import type { FeedItem } from '../types/api';

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
