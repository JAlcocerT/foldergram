<template>
  <section class="content-column content-column--profile">
    <ErrorState v-if="profilesStore.profileError" title="Could not load folder" :message="profilesStore.profileError" />
    <template v-else-if="profilesStore.currentProfile">
      <ProfileHeader :profile="profilesStore.currentProfile" />
      <EmptyState
        v-if="!profilesStore.loadingProfile && profilesStore.currentImages.length === 0"
        title="No images in this folder"
        description="Drop supported images into this folder and rescan to see them here."
      />
      <template v-else>
        <div class="profile-tabs" aria-label="Folder sections">
          <span class="profile-tabs__item profile-tabs__item--active">Posts</span>
        </div>
        <ProfileGrid :items="profilesStore.currentImages" />
        <InfiniteLoader :loading="profilesStore.loadingProfile" :has-more="profilesStore.currentHasMore" @load-more="loadMore" />
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import InfiniteLoader from '../components/InfiniteLoader.vue';
import ProfileGrid from '../components/ProfileGrid.vue';
import ProfileHeader from '../components/ProfileHeader.vue';
import { useProfilesStore } from '../stores/profiles';

const props = defineProps<{
  slug: string;
}>();

const profilesStore = useProfilesStore();

async function loadProfile() {
  await profilesStore.loadProfile(props.slug, true);
}

async function loadMore() {
  if (profilesStore.currentHasMore) {
    await profilesStore.loadProfile(props.slug, false);
  }
}

onMounted(loadProfile);
watch(() => props.slug, loadProfile);
</script>
