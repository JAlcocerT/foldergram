<template>
  <AppShell>
    <RouterView :route="displayRoute" />
    <div v-if="showImageModal" class="route-modal" @click.self="closeImageModal">
      <ImageView :id="String(route.params.id ?? '')" modal @close="closeImageModal" />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

import AppShell from './components/AppShell.vue';
import ImageView from './views/ImageView.vue';
import { useAppStore } from './stores/app';
import { useLikesStore } from './stores/likes';
import { useProfilesStore } from './stores/profiles';

const appStore = useAppStore();
const likesStore = useLikesStore();
const profilesStore = useProfilesStore();
const route = useRoute();
const router = useRouter();

const modalBackgroundRoute = computed(() =>
  appStore.imageModalBackgroundPath ? router.resolve(appStore.imageModalBackgroundPath) : null
);
const showImageModal = computed(
  () => route.name === 'image' && modalBackgroundRoute.value !== null && modalBackgroundRoute.value.fullPath !== route.fullPath
);
const displayRoute = computed(() => (showImageModal.value && modalBackgroundRoute.value ? modalBackgroundRoute.value : route));

onMounted(async () => {
  await Promise.all([appStore.fetchStats(), profilesStore.fetchProfiles(), likesStore.initialize()]);
});

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
