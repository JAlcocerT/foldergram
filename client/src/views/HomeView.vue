<template>
  <section class="home-layout">
    <div class="home-feed">
      <header v-if="appStore.stats" class="page-header page-header--feed page-header--compact">
        <p>{{ appStore.stats.indexedImages }} images across {{ appStore.stats.profiles }} folders</p>
      </header>

      <section v-if="appStore.isScanning && appStore.stats" class="scan-state scan-state--inline" aria-live="polite">
        <strong>Scanning library</strong>
        <p>{{ scanDescription }}</p>
      </section>

      <section v-if="storyProfiles.length" class="stories-bar" aria-label="Folders">
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

      <EmptyState
        v-if="appStore.isLibraryUnavailable"
        title="Library storage unavailable"
        :description="appStore.libraryUnavailableReason"
      />
      <ErrorState v-else-if="feedStore.error" title="Could not load feed" :message="feedStore.error" />
      <section v-else-if="showInitialScanState" class="scan-state">
        <span class="scan-state__eyebrow">Startup scan in progress</span>
        <h2>Indexing your library</h2>
        <p>{{ scanDescription }}</p>
        <dl class="scan-state__stats">
          <div>
            <dt>Folders</dt>
            <dd>{{ appStore.stats?.scan.processedProfiles ?? 0 }}/{{ appStore.stats?.scan.discoveredProfiles ?? 0 }}</dd>
          </div>
          <div>
            <dt>Images indexed</dt>
            <dd>{{ appStore.stats?.scan.processedImages ?? 0 }}/{{ appStore.stats?.scan.discoveredImages ?? 0 }}</dd>
          </div>
          <div>
            <dt>Thumbnails</dt>
            <dd>{{ appStore.stats?.scan.generatedThumbnails ?? 0 }}</dd>
          </div>
          <div>
            <dt>Previews</dt>
            <dd>{{ appStore.stats?.scan.generatedPreviews ?? 0 }}</dd>
          </div>
        </dl>
      </section>
      <EmptyState
        v-else-if="feedStore.initialized && feedStore.items.length === 0"
        title="No images indexed yet"
        description="Add folders under data/gallery/ and the feed will populate after the next scan."
      />
      <template v-else>
        <FeedList :items="feedStore.items" :show-skeleton="!feedStore.initialized && feedStore.loading" />
        <InfiniteLoader :loading="feedStore.loading" :has-more="feedStore.hasMore" @load-more="feedStore.loadMore" />
      </template>
    </div>

    <aside v-if="!appStore.isLibraryUnavailable && homeSummaryFolder" class="home-rail" aria-label="Folder recommendations">
      <div class="home-rail__summary">
        <Avatar :name="homeSummaryFolder.name" :src="homeSummaryFolder.avatarUrl" />
        <div>
          <strong>{{ homeSummaryFolder.slug }}</strong>
          <p>{{ homeSummaryFolder.name }}</p>
        </div>
        <RouterLink :to="{ name: 'profile', params: { slug: homeSummaryFolder.slug } }">Open</RouterLink>
      </div>

      <div class="home-rail__header">
        <span>Suggested folders</span>
        <RouterLink :to="{ name: 'likes' }">View likes</RouterLink>
      </div>

      <div class="home-rail__list">
        <RouterLink
          v-for="profile in recommendedFolders"
          :key="profile.id"
          class="home-rail__item"
          :to="{ name: 'profile', params: { slug: profile.slug } }"
        >
          <Avatar :name="profile.name" :src="profile.avatarUrl" />
          <div>
            <strong>{{ profile.slug }}</strong>
            <p>{{ profile.imageCount }} posts</p>
          </div>
          <span>Open</span>
        </RouterLink>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
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
const homeSummaryFolder = computed(() => profilesStore.items[0] ?? null);
const recommendedFolders = computed(() => profilesStore.items.slice(1, 6));
const showInitialScanState = computed(
  () => appStore.isScanning && feedStore.items.length === 0 && !feedStore.loading && !feedStore.error
);
const scanDescription = computed(() => {
  const scan = appStore.stats?.scan;
  if (!scan) {
    return 'Preparing scan status...';
  }

  const currentFolder = scan.currentFolder ? ` Current folder: ${scan.currentFolder}.` : '';
  if (scan.phase === 'derivatives') {
    return `Generating thumbnails and previews in the background.${currentFolder}`;
  }

  return `Indexing folders and images so the library can open immediately.${currentFolder}`;
});

onMounted(async () => {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  await feedStore.loadInitial();
});

watch(
  () => [appStore.stats?.indexedImages ?? 0, appStore.stats?.profiles ?? 0] as const,
  async ([indexedImages, profileCount]) => {
    if (appStore.isLibraryUnavailable) {
      return;
    }

    if (profileCount > 0 && profileCount !== profilesStore.items.length) {
      await profilesStore.fetchProfiles(true);
    }

    if (indexedImages > 0 && feedStore.items.length === 0 && !feedStore.loading) {
      await feedStore.loadInitial(true);
    }
  }
);
</script>
