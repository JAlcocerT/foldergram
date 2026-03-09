<template>
  <section class="content-column content-column--feed">
    <header class="page-header page-header--feed">
      <div>
        <span class="eyebrow">Local gallery</span>
        <h1>Home</h1>
      </div>
      <p v-if="appStore.stats">
        {{ appStore.stats.indexedImages }} images across {{ appStore.stats.profiles }} profiles
      </p>
    </header>

    <section v-if="storyProfiles.length" class="stories-bar" aria-label="Profiles">
      <RouterLink
        v-for="profile in storyProfiles"
        :key="profile.id"
        class="stories-bar__item"
        :to="{ name: 'profile', params: { slug: profile.slug } }"
      >
        <div class="stories-bar__ring">
          <Avatar :name="profile.name" :src="profile.avatarUrl" />
        </div>
        <span>{{ profile.slug }}</span>
      </RouterLink>
    </section>

    <ErrorState v-if="feedStore.error" title="Could not load feed" :message="feedStore.error" />
    <EmptyState
      v-else-if="feedStore.initialized && feedStore.items.length === 0"
      title="No images indexed yet"
      description="Add profile folders under gallery/ and the feed will populate after the next scan."
    />
    <template v-else>
      <FeedList :items="feedStore.items" :show-skeleton="!feedStore.initialized && feedStore.loading" />
      <InfiniteLoader :loading="feedStore.loading" :has-more="feedStore.hasMore" @load-more="feedStore.loadMore" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';

import Avatar from '../components/Avatar.vue';
import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import FeedList from '../components/FeedList.vue';
import InfiniteLoader from '../components/InfiniteLoader.vue';
import { useAppStore } from '../stores/app';
import { useFeedStore } from '../stores/feed';
import { useProfilesStore } from '../stores/profiles';

const appStore = useAppStore();
const feedStore = useFeedStore();
const profilesStore = useProfilesStore();
const storyProfiles = computed(() => profilesStore.items.slice(0, 10));

onMounted(async () => {
  await feedStore.loadInitial();
});
</script>
