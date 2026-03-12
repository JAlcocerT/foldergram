<template>
  <AppShell>
    <RouterView :route="displayRoute" />
    <div v-if="showImageModal" class="fixed inset-0 z-40 flex items-center justify-center px-8 py-8 max-md:px-4 max-md:py-4 bg-black/72" @click.self="closeImageModal">
      <ImageView :id="String(route.params.id ?? '')" modal @close="closeImageModal" />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { RouterView, useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router';

import AppShell from './components/AppShell.vue';
import ImageView from './views/ImageView.vue';
import { useAppStore } from './stores/app';
import { useLikesStore } from './stores/likes';
import { useFoldersStore } from './stores/folders';

const appStore = useAppStore();
const likesStore = useLikesStore();
const foldersStore = useFoldersStore();
const route = useRoute();
const router = useRouter();

function resolveDisplayRoute(targetPath: string): RouteLocationNormalizedLoaded | null {
  const resolved = router.resolve(targetPath);
  const resolvedName = resolved.name;
  if (resolvedName === null) {
    return null;
  }

  const { href: _href, name: _ignoredName, ...displayRoute } = resolved;
  return {
    ...displayRoute,
    name: resolvedName
  };
}

const modalBackgroundRoute = computed<RouteLocationNormalizedLoaded | null>(() => {
  if (!appStore.imageModalBackgroundPath) {
    return null;
  }

  return resolveDisplayRoute(appStore.imageModalBackgroundPath);
});
const showImageModal = computed(
  () => route.name === 'image' && modalBackgroundRoute.value !== null && modalBackgroundRoute.value.fullPath !== route.fullPath
);
const displayRoute = computed<RouteLocationNormalizedLoaded | undefined>(() =>
  showImageModal.value ? modalBackgroundRoute.value ?? undefined : route
);

onMounted(async () => {
  await Promise.all([appStore.fetchStats(), foldersStore.fetchFolders(), likesStore.initialize()]);
});

onUnmounted(() => {
  appStore.stopStatsPolling();
});

watch(
  () => appStore.stats?.folders ?? 0,
  async (folderCount) => {
    if (appStore.isLibraryUnavailable || folderCount === 0 || folderCount === foldersStore.items.length) {
      return;
    }

    await foldersStore.fetchFolders(true);
  }
);

watch(
  () => route.name,
  (name) => {
    if (name !== 'image') {
      appStore.clearImageModalBackground();
    }
  }
);

async function closeImageModal() {
  const targetPath = appStore.imageModalBackgroundPath ?? '/';
  await router.replace(targetPath);
}
</script>
