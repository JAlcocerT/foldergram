<template>
  <!-- Desktop: fixed sidebar + content with margin-left -->
  <!-- Mobile: no sidebar, TopNav handles nav -->
  <div class="flex min-h-screen overflow-x-clip">
    <!-- Sidebar: fixed on desktop, hidden on mobile -->
    <SidebarNav class="hidden md:flex fixed top-0 left-0 h-screen z-30" />
    <!-- Content: margin-left matches sidebar width on desktop -->
    <div class="flex-1 min-w-0 md:ml-[4.85rem]">
      <TopNav />
      <div
        v-if="appStore.isScanning && appStore.stats"
        class="flex flex-wrap items-center gap-x-4 gap-y-[0.7rem] mx-[2.5rem] mt-4 mb-0 px-4 py-[0.8rem] border border-border rounded-[1rem] bg-[linear-gradient(135deg,rgba(0,149,246,0.1)_0%,rgba(0,149,246,0.04)_100%)] shadow-[var(--shadow)]"
        role="status"
        aria-live="polite"
      >
        <strong class="text-[0.88rem]">Scanning library</strong>
        <span class="text-muted text-[0.83rem]">
          {{ appStore.stats.scan.processedImages }}/{{ appStore.stats.scan.discoveredImages || '?' }} indexed
          | {{ appStore.stats.scan.generatedThumbnails }} thumbnails
          | {{ appStore.stats.scan.generatedPreviews }} previews
        </span>
        <span v-if="appStore.stats.scan.currentFolder" class="text-muted text-[0.83rem]">Current: {{ appStore.stats.scan.currentFolder }}</span>
      </div>
      <main class="px-10 pt-7 pb-16 md:px-[0.9rem] md:pt-4 md:pb-10">
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
