<template>
  <section class="flex flex-col gap-[1.2rem]">
    <SkeletonCard v-if="showSkeleton" v-for="index in 4" :key="index" />
    <FeedCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :avatar-url="profileLookup.get(item.profileSlug)?.avatarUrl ?? null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useProfilesStore } from '../stores/profiles';
import type { FeedItem } from '../types/api';
import FeedCard from './FeedCard.vue';
import SkeletonCard from './SkeletonCard.vue';

const props = defineProps<{
  items: FeedItem[];
  showSkeleton?: boolean;
}>();

const profilesStore = useProfilesStore();
const profileLookup = computed(() => new Map(profilesStore.items.map((profile) => [profile.slug, profile])));
</script>
