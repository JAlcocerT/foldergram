<template>
  <div class="shell">
    <SidebarNav class="shell__sidebar" />
    <div class="shell__content">
      <TopNav />
      <div v-if="appStore.isScanning && appStore.stats" class="scan-banner" role="status" aria-live="polite">
        <strong>Scanning library</strong>
        <span>
          {{ appStore.stats.scan.processedImages }}/{{ appStore.stats.scan.discoveredImages || '?' }} indexed
          | {{ appStore.stats.scan.generatedThumbnails }} thumbnails
          | {{ appStore.stats.scan.generatedPreviews }} previews
        </span>
        <span v-if="appStore.stats.scan.currentFolder">Current: {{ appStore.stats.scan.currentFolder }}</span>
      </div>
      <main class="shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import SidebarNav from './SidebarNav.vue';
import TopNav from './TopNav.vue';

import { useAppStore } from '../stores/app';

const appStore = useAppStore();
</script>
