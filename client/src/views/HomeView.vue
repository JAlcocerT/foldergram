<template>
  <section class="grid grid-cols-[minmax(0,39.75rem)_19rem] gap-[3.5rem] items-start justify-center w-[min(100%,67rem)] mx-auto max-md:grid-cols-1 max-md:w-full">
    <!-- Main feed column -->
    <div class="min-w-0">
      <header v-if="appStore.stats" class="flex items-end justify-between gap-4 pb-[0.8rem]">
        <p class="m-0 text-muted">{{ appStore.stats.indexedImages }} images across {{ appStore.stats.folders }} folders</p>
      </header>

      <section
        v-if="appStore.isLibraryRebuildRequired && appStore.stats"
        class="grid gap-[0.55rem] px-5 py-[1rem] mb-[1.1rem] border rounded-[1rem] shadow-[var(--shadow)]"
        style="background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 88%, #fff4d1 12%) 0%, color-mix(in srgb, var(--surface) 82%, #ffe49a 18%) 100%); border-color: color-mix(in srgb, var(--border) 72%, #d2a133 28%);"
      >
        <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
          <div class="grid gap-[0.2rem]">
            <strong>Library location changed</strong>
            <p class="m-0 text-muted">
              The current index may still contain folders and cached media from a previous gallery location. Review the rebuild steps to reset the index and regenerate thumbnails and previews for the current library.
            </p>
          </div>
          <RouterLink class="inline-flex items-center justify-center min-h-10 px-4 rounded-[0.8rem] text-[0.84rem] font-bold text-white bg-[#9f6a00] whitespace-nowrap" :to="{ name: 'settings', query: { action: 'rebuild' } }">
            Review Rebuild
          </RouterLink>
        </div>
      </section>

      <!-- Inline scan state (while feed already loaded) -->
      <section v-if="appStore.isScanning && appStore.stats" class="grid gap-[0.3rem] px-4 py-[0.95rem] mb-[1.1rem] border border-border rounded-[1rem] bg-surface shadow-[var(--shadow)]" aria-live="polite">
        <strong>Scanning library</strong>
        <p class="m-0 text-muted">{{ scanDescription }}</p>
      </section>

      <section v-if="!appStore.isLibraryUnavailable" class="grid gap-[1rem] mb-5">
        <div class="grid gap-[0.75rem]">
          <div class="grid gap-[0.2rem]">
            <strong class="text-[1rem]">Home Feed</strong>
            <p class="m-0 text-muted max-w-[42rem]">{{ activeModeDescription }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="mode in feedModes"
              :key="mode.id"
              class="min-h-10 px-4 rounded-full border text-[0.82rem] font-bold transition-[background-color,border-color,color,box-shadow] duration-180"
              :class="feedStore.mode === mode.id ? 'border-[#1f2937] text-white shadow-[var(--shadow)]' : 'border-border text-text bg-surface hover:border-text/25 hover:bg-surface-alt'"
              :style="
                feedStore.mode === mode.id
                  ? 'background: linear-gradient(135deg, #1f2937 0%, #111827 100%);'
                  : undefined
              "
              type="button"
              @click="selectMode(mode.id)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <section v-if="momentsStore.items.length" class="grid gap-[0.8rem]">
          <div class="flex items-center justify-between gap-4">
            <div class="grid gap-[0.15rem]">
              <strong class="text-[0.98rem]">{{ momentsStore.railTitle }}</strong>
              <p class="m-0 text-muted text-[0.82rem]">{{ momentsStore.railDescription }}</p>
            </div>
          </div>
          <div class="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none]" :aria-label="momentsStore.railTitle">
            <RouterLink
              v-for="moment in momentsStore.items"
              :key="moment.id"
              class="flex flex-col items-center gap-[0.45rem] min-w-[5.5rem] text-muted text-[0.69rem] text-center"
              :to="{ name: 'moment', params: { id: moment.id } }"
              :title="`${moment.title} · ${moment.subtitle}`"
            >
              <div class="p-[2px] rounded-full bg-[var(--story-ring)]">
                <Avatar class="w-[4.2rem] h-[4.2rem] border-2 border-bg" :name="moment.title" :src="moment.coverImage.thumbnailUrl" />
              </div>
              <span class="max-w-full overflow-hidden text-ellipsis font-semibold text-text">{{ moment.title }}</span>
              <span class="max-w-full overflow-hidden text-ellipsis">{{ moment.imageCount }} photos</span>
            </RouterLink>
          </div>
        </section>
      </section>

      <!-- States -->
      <EmptyState v-if="appStore.isLibraryUnavailable" title="Library storage unavailable" :description="appStore.libraryUnavailableReason" />
      <ErrorState v-else-if="feedStore.error" title="Could not load feed" :message="feedStore.error" />

      <!-- Initial scan state (no feed yet) -->
      <section v-else-if="showInitialScanState" class="grid gap-[0.85rem] px-5 py-5 mb-[1.1rem] border border-border rounded-[1rem] shadow-[var(--shadow)]" style="background: radial-gradient(circle at top right, rgba(0,149,246,0.12), transparent 38%), linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 90%, var(--accent) 10%) 100%);">
        <span class="text-accent-strong text-[0.75rem] font-bold tracking-[0.08em] uppercase">Startup scan in progress</span>
        <h2 class="m-0">Indexing your library</h2>
        <p class="m-0 text-muted">{{ scanDescription }}</p>
        <dl class="grid grid-cols-4 gap-[0.8rem] m-0 max-sm:grid-cols-2">
          <div class="px-[0.9rem] py-[0.8rem] rounded-[0.85rem]" style="background: color-mix(in srgb, var(--surface-alt) 88%, var(--accent) 12%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.74rem] uppercase tracking-[0.05em]">Folders</dt>
            <dd class="m-0 text-base font-bold">{{ appStore.stats?.scan.processedFolders ?? 0 }}/{{ appStore.stats?.scan.discoveredFolders ?? 0 }}</dd>
          </div>
          <div class="px-[0.9rem] py-[0.8rem] rounded-[0.85rem]" style="background: color-mix(in srgb, var(--surface-alt) 88%, var(--accent) 12%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.74rem] uppercase tracking-[0.05em]">Images indexed</dt>
            <dd class="m-0 text-base font-bold">{{ appStore.stats?.scan.processedImages ?? 0 }}/{{ appStore.stats?.scan.discoveredImages ?? 0 }}</dd>
          </div>
          <div class="px-[0.9rem] py-[0.8rem] rounded-[0.85rem]" style="background: color-mix(in srgb, var(--surface-alt) 88%, var(--accent) 12%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.74rem] uppercase tracking-[0.05em]">Thumbnails</dt>
            <dd class="m-0 text-base font-bold">{{ appStore.stats?.scan.generatedThumbnails ?? 0 }}</dd>
          </div>
          <div class="px-[0.9rem] py-[0.8rem] rounded-[0.85rem]" style="background: color-mix(in srgb, var(--surface-alt) 88%, var(--accent) 12%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.74rem] uppercase tracking-[0.05em]">Previews</dt>
            <dd class="m-0 text-base font-bold">{{ appStore.stats?.scan.generatedPreviews ?? 0 }}</dd>
          </div>
        </dl>
      </section>

      <EmptyState v-else-if="feedStore.initialized && feedStore.items.length === 0" title="No images indexed yet" description="Add folders under data/gallery/ and the feed will populate after the next scan." />
      <template v-else>
        <!-- Feed cards in home-layout context: transparent card, no shadow -->
        <div class="flex flex-col gap-[1.2rem]">
          <FeedList :items="feedStore.items" :show-skeleton="!feedStore.initialized && feedStore.loading" />
        </div>
        <InfiniteLoader :loading="feedStore.loading" :has-more="feedStore.hasMore" @load-more="feedStore.loadMore" />
      </template>
    </div>

    <!-- Right rail (suggestions) — hidden on mobile -->
    <aside v-if="!appStore.isLibraryUnavailable && homeSummaryFolder" class="sticky top-8 grid gap-[1.15rem] text-muted max-md:hidden" aria-label="Folder recommendations">
      <div class="flex items-center gap-[0.8rem]">
        <Avatar class="w-11 h-11" :name="homeSummaryFolder.name" :src="homeSummaryFolder.avatarUrl" />
        <div class="flex-1 min-w-0">
          <strong class="block text-text text-[0.87rem] font-bold">{{ homeSummaryFolder.name }}</strong>
          <p class="m-0 mt-[0.12rem] text-[0.79rem] truncate">{{ homeSummaryFolder.breadcrumb ?? 'Top-level source folder' }}</p>
        </div>
        <RouterLink class="ml-auto text-accent-strong text-[0.76rem] font-bold" :to="{ name: 'folder', params: { slug: homeSummaryFolder.slug } }">Open</RouterLink>
      </div>

      <div class="flex items-center justify-between gap-4 text-text text-[0.96rem] font-bold">
        <span>Suggested folders</span>
        <RouterLink class="text-muted text-[0.76rem] font-bold" :to="{ name: 'likes' }">View likes</RouterLink>
      </div>

      <div class="grid gap-[0.95rem]">
        <RouterLink
          v-for="folder in recommendedFolders"
          :key="folder.id"
          class="flex items-center gap-[0.8rem]"
          :to="{ name: 'folder', params: { slug: folder.slug } }"
        >
          <Avatar class="w-11 h-11" :name="folder.name" :src="folder.avatarUrl" />
          <div class="flex-1 min-w-0">
            <strong class="block text-text text-[0.87rem] font-bold">{{ folder.name }}</strong>
            <p class="m-0 mt-[0.12rem] text-[0.79rem] truncate">{{ folder.breadcrumb ?? 'Top-level source folder' }}</p>
          </div>
          <span class="ml-auto text-accent-strong text-[0.76rem] font-bold">Open</span>
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
import { useLikesStore } from '../stores/likes';
import { useFoldersStore } from '../stores/folders';
import { useMomentsStore } from '../stores/moments';
import type { FeedMode } from '../types/api';
import { buildLikedCountByFolder, selectHomeRecommendations } from '../utils/home-recommendations';

const appStore = useAppStore();
const feedStore = useFeedStore();
const likesStore = useLikesStore();
const foldersStore = useFoldersStore();
const momentsStore = useMomentsStore();
const likedCountByFolder = computed(() => buildLikedCountByFolder(likesStore.items));
const homeRecommendations = computed(() =>
  selectHomeRecommendations(foldersStore.items, likedCountByFolder.value, appStore.lastOpenedFolderSlug)
);
const homeSummaryFolder = computed(() => homeRecommendations.value.homeSummaryFolder);
const recommendedFolders = computed(() => homeRecommendations.value.recommendedFolders);
const feedModes: Array<{ id: FeedMode; label: string; description: string }> = [
  {
    id: 'recent',
    label: 'Recent',
    description: 'Newest photos first, with lighter runs from the same app folder.'
  },
  {
    id: 'rediscover',
    label: 'Rediscover',
    description: 'Older photos resurface when they are worth another look.'
  },
  {
    id: 'random',
    label: 'Random',
    description: 'A stable session shuffle for aimless browsing.'
  }
];
const activeModeDescription = computed(
  () => feedModes.find((mode) => mode.id === feedStore.mode)?.description ?? feedModes[0].description
);
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

async function selectMode(mode: FeedMode) {
  await feedStore.setMode(mode);
}

onMounted(async () => {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  feedStore.initializeMode();
  await Promise.all([feedStore.loadInitial(), momentsStore.fetchMoments()]);
});

watch(
  () => [appStore.stats?.indexedImages ?? 0, appStore.stats?.folders ?? 0] as const,
  async ([indexedImages, folderCount]) => {
    if (appStore.isLibraryUnavailable) {
      return;
    }

    if (folderCount > 0 && folderCount !== foldersStore.items.length) {
      await foldersStore.fetchFolders(true);
    }

    if (indexedImages > 0 && feedStore.items.length === 0 && !feedStore.loading) {
      await feedStore.loadInitial(true);
    }

    if (indexedImages > 0 && momentsStore.items.length === 0 && !momentsStore.loadingList) {
      await momentsStore.fetchMoments(true);
    }
  }
);

watch(
  () => appStore.stats?.scan.lastCompletedScan?.id ?? null,
  async (lastCompletedScanId, previousScanId) => {
    if (
      appStore.isLibraryUnavailable ||
      lastCompletedScanId === null ||
      lastCompletedScanId === previousScanId ||
      momentsStore.loadingList
    ) {
      return;
    }

    await momentsStore.fetchMoments(true);
  }
);
</script>
