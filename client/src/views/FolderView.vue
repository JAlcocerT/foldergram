<template>
  <section class="w-[min(100%,58rem)] mx-auto">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <ErrorState v-else-if="foldersStore.folderError" title="Could not load folder" :message="foldersStore.folderError" />
    <template v-else-if="foldersStore.currentFolder">
      <FolderHeader :folder="foldersStore.currentFolder" />
      <EmptyState
        v-if="!foldersStore.loadingFolder && foldersStore.currentImages.length === 0"
        title="No images in this folder"
        description="Drop supported images into this folder and rescan to see them here."
      />
      <template v-else>
        <div class="flex justify-center py-[0.95rem] mb-[0.45rem] border-t border-border" aria-label="Folder sections">
          <span class="relative pt-[0.1rem] text-text text-[0.78rem] font-bold tracking-[0.11em] uppercase folder-tabs__item--active">Posts</span>
        </div>
        <FolderGrid :items="foldersStore.currentImages" />
        <InfiniteLoader :loading="foldersStore.loadingFolder" :has-more="foldersStore.currentHasMore" @load-more="loadMore" />
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

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

async function loadFolder() {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  await foldersStore.loadFolder(props.slug, true);
}

async function loadMore() {
  if (foldersStore.currentHasMore) {
    await foldersStore.loadFolder(props.slug, false);
  }
}

onMounted(loadFolder);
watch(() => props.slug, loadFolder);
</script>
