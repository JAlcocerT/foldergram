<template>
  <section class="w-[min(100%,58rem)] mx-auto">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <section v-else-if="appStore.isRebuilding && !foldersStore.currentFolder" class="card p-8 text-center">
      <p class="m-0 text-muted">Rebuilding the library index. Folder content will return as soon as this scan reaches it.</p>
    </section>
    <ErrorState v-else-if="foldersStore.folderError" title="Could not load folder" :message="foldersStore.folderError" />
    <template v-else-if="foldersStore.currentFolder">
      <FolderHeader :folder="foldersStore.currentFolder" />
      <EmptyState
        v-if="!foldersStore.loadingFolder && foldersStore.currentImages.length === 0"
        :title="activeTab === 'reels' ? 'No reels in this folder' : 'No posts in this folder'"
        :description="
          activeTab === 'reels'
            ? 'Drop supported videos into this folder and rescan to see them in the reels tab.'
            : 'Drop supported photos or videos into this folder and rescan to see them here.'
        "
      />
      <template v-else>
        <div class="flex justify-center py-[0.95rem] mb-[0.45rem] border-t border-border" aria-label="Folder sections">
          <div class="flex items-center gap-8">
            <button
              class="relative border-0 bg-transparent p-0 text-[0.78rem] font-bold tracking-[0.11em] uppercase cursor-pointer"
              :class="activeTab === 'posts' ? 'text-text folder-tabs__item--active' : 'text-muted'"
              type="button"
              @click="setTab('posts')"
            >
              Posts
            </button>
            <button
              class="relative border-0 bg-transparent p-0 text-[0.78rem] font-bold tracking-[0.11em] uppercase cursor-pointer"
              :class="activeTab === 'reels' ? 'text-text folder-tabs__item--active' : 'text-muted'"
              type="button"
              @click="setTab('reels')"
            >
              Reels
            </button>
          </div>
        </div>
        <FolderGrid :items="foldersStore.currentImages" :variant="activeTab === 'reels' ? 'portrait' : 'square'" />
        <InfiniteLoader :loading="foldersStore.loadingFolder" :has-more="foldersStore.currentHasMore" @load-more="loadMore" />
      </template>
    </template>
    <EmptyState
      v-else-if="hasLoadedOnce && !foldersStore.loadingFolder"
      title="No direct posts in this app folder"
      description="This source folder no longer has direct photos or videos. Browse the library to continue."
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import InfiniteLoader from '../components/InfiniteLoader.vue';
import FolderGrid from '../components/FolderGrid.vue';
import FolderHeader from '../components/FolderHeader.vue';
import { useAppStore } from '../stores/app';
import { useFoldersStore } from '../stores/folders';

const props = defineProps<{
  slug: string;
}>();

const appStore = useAppStore();
const foldersStore = useFoldersStore();
const route = useRoute();
const router = useRouter();
const hasLoadedOnce = ref(false);
const activeTab = computed(() => (route.query.tab === 'reels' ? 'reels' : 'posts'));

async function loadFolder() {
  if (appStore.isLibraryUnavailable) {
    hasLoadedOnce.value = true;
    return;
  }

  await foldersStore.loadFolder(props.slug, true, activeTab.value === 'reels' ? 'video' : undefined);
  hasLoadedOnce.value = true;
}

async function loadMore() {
  if (foldersStore.currentHasMore) {
    await foldersStore.loadFolder(props.slug, false, activeTab.value === 'reels' ? 'video' : undefined);
  }
}

async function setTab(tab: 'posts' | 'reels') {
  if (activeTab.value === tab) {
    return;
  }

  const nextQuery =
    tab === 'reels'
      ? { ...route.query, tab: 'reels' }
      : Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'tab'));

  await router.replace({
    name: 'folder',
    params: { slug: props.slug },
    query: nextQuery
  });
}

onMounted(loadFolder);
watch(
  () => [props.slug, activeTab.value] as const,
  async () => {
    hasLoadedOnce.value = false;
    await loadFolder();
  }
);
</script>
