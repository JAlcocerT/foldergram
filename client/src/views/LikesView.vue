<template>
  <section class="content-column content-column--profile">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <ErrorState v-else-if="likesStore.error" title="Could not load likes" :message="likesStore.error" />
    <template v-else>
      <div class="profile-tabs" aria-label="Likes sections">
        <span class="profile-tabs__item profile-tabs__item--active">Liked posts</span>
      </div>
      <EmptyState
        v-if="!likesStore.loading && likesStore.items.length === 0"
        title="No liked posts yet"
        description="Tap the heart under any post and it will appear here."
      />
      <div v-else-if="likesStore.loading" class="panel panel--centered">
        <p>Loading likes...</p>
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
