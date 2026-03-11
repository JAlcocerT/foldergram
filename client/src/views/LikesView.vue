<template>
  <section class="w-[min(100%,58rem)] mx-auto">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <ErrorState v-else-if="likesStore.error" title="Could not load likes" :message="likesStore.error" />
    <template v-else>
      <div class="flex justify-center py-[0.95rem] mb-[0.45rem] border-t border-border" aria-label="Likes sections">
        <span class="relative pt-[0.1rem] text-text text-[0.78rem] font-bold tracking-[0.11em] uppercase profile-tabs__item--active">Liked posts</span>
      </div>
      <EmptyState
        v-if="!likesStore.loading && likesStore.items.length === 0"
        title="No liked posts yet"
        description="Tap the heart under any post and it will appear here."
      />
      <div v-else-if="likesStore.loading" class="card p-8 text-center">
        <p class="text-muted">Loading likes...</p>
      </div>
      <ProfileGrid v-else :items="likesStore.items" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import ProfileGrid from '../components/ProfileGrid.vue';
import { useAppStore } from '../stores/app';
import { useLikesStore } from '../stores/likes';

const appStore = useAppStore();
const likesStore = useLikesStore();

onMounted(async () => {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  await likesStore.initialize();
});
</script>
