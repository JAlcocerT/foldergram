<template>
  <section class="flex flex-col gap-[1.2rem]">
    <SkeletonCard v-if="showSkeleton" v-for="index in 4" :key="index" />
    <FeedCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :avatar-url="folderLookup.get(item.folderSlug)?.avatarUrl ?? null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useFoldersStore } from '../stores/folders';
import type { FeedItem } from '../types/api';
import FeedCard from './FeedCard.vue';
import SkeletonCard from './SkeletonCard.vue';

const props = defineProps<{
  items: FeedItem[];
  showSkeleton?: boolean;
}>();

const foldersStore = useFoldersStore();
const folderLookup = computed(() => new Map(foldersStore.items.map((folder) => [folder.slug, folder])));
</script>
