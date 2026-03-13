<template>
  <AppShell>
    <RouterView :route="displayRoute" />
    <div v-if="showImageModal" class="fixed inset-0 z-40 flex items-center justify-center px-8 py-8 max-md:px-4 max-md:py-4 bg-black/72" @click.self="closeImageModal">
      <ImageView :id="String(route.params.id ?? '')" modal @close="closeImageModal" />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
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
let lockedScrollX = 0;
let lockedScrollY = 0;
let modalScrollLocked = false;
const previousBodyStyles = {
  position: '',
  top: '',
  left: '',
  right: '',
  width: '',
  overflowY: '',
  paddingRight: ''
};

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

function lockModalScroll() {
  if (modalScrollLocked) {
    return;
  }

  lockedScrollX = window.scrollX;
  lockedScrollY = window.scrollY;

  previousBodyStyles.position = document.body.style.position;
  previousBodyStyles.top = document.body.style.top;
  previousBodyStyles.left = document.body.style.left;
  previousBodyStyles.right = document.body.style.right;
  previousBodyStyles.width = document.body.style.width;
  previousBodyStyles.overflowY = document.body.style.overflowY;
  previousBodyStyles.paddingRight = document.body.style.paddingRight;

  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = `-${lockedScrollX}px`;
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.overflowY = 'hidden';

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  modalScrollLocked = true;
}

function unlockModalScroll() {
  if (!modalScrollLocked) {
    return;
  }

  document.body.style.position = previousBodyStyles.position;
  document.body.style.top = previousBodyStyles.top;
  document.body.style.left = previousBodyStyles.left;
  document.body.style.right = previousBodyStyles.right;
  document.body.style.width = previousBodyStyles.width;
  document.body.style.overflowY = previousBodyStyles.overflowY;
  document.body.style.paddingRight = previousBodyStyles.paddingRight;
  window.scrollTo(lockedScrollX, lockedScrollY);

  modalScrollLocked = false;
}

onMounted(async () => {
  await Promise.all([appStore.fetchStats(), foldersStore.fetchFolders(), likesStore.initialize()]);
});

onUnmounted(() => {
  unlockModalScroll();
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
  showImageModal,
  async (isVisible, wasVisible) => {
    if (isVisible) {
      lockModalScroll();
      return;
    }

    if (!wasVisible) {
      return;
    }

    await nextTick();
    unlockModalScroll();

    requestAnimationFrame(() => {
      if (route.name !== 'image') {
        appStore.clearImageModalBackground();
      }
    });
  },
  {
    immediate: true
  }
);

async function closeImageModal() {
  const targetPath = appStore.imageModalBackgroundPath ?? '/';
  await router.replace(targetPath);
}
</script>
