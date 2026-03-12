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
    <EmptyState
      v-else-if="hasLoadedOnce && !foldersStore.loadingFolder"
      title="No direct images in this app folder"
      description="This source folder no longer has direct images. Browse the library to continue."
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

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
const hasLoadedOnce = ref(false);

async function loadFolder() {
  if (appStore.isLibraryUnavailable) {
    hasLoadedOnce.value = true;
    return;
  }

  await foldersStore.loadFolder(props.slug, true);
  hasLoadedOnce.value = true;
}

async function loadMore() {
  if (foldersStore.currentHasMore) {
    await foldersStore.loadFolder(props.slug, false);
  }
}

onMounted(loadFolder);
watch(() => props.slug, async () => {
  hasLoadedOnce.value = false;
  await loadFolder();
});
</script>
