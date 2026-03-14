<template>
  <!-- Desktop: fixed sidebar + content with margin-left -->
  <!-- Mobile: no sidebar, TopNav handles nav -->
  <div class="app-shell flex min-h-screen overflow-x-clip" :class="{ 'app-shell--explore': isExploreShell }">
    <!-- Sidebar: fixed on desktop, hidden on mobile -->
    <SidebarNav class="hidden md:flex fixed top-0 left-0 h-screen z-30" />
    <!-- Content: margin-left matches sidebar width on desktop -->
    <div class="app-shell__content flex-1 min-w-0 md:ml-[4.85rem]">
      <TopNav />
      <main
        class="app-shell__main"
        :class="[
          isExploreShell
            ? 'px-0 pt-0 pb-0 md:px-0 md:pt-0 md:pb-0'
            : 'px-10 pt-7 pb-16 md:px-[0.9rem] md:pt-4 md:pb-10',
          showStickyScanStatus ? 'pb-36 md:pb-40' : ''
        ]"
      >
        <slot />
      </main>
    </div>

    <div
      v-if="showStickyScanStatus"
      class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <section
        class="pointer-events-auto w-[min(100%,44rem)] rounded-[1.15rem] border border-white/12 px-4 py-[0.95rem] text-white shadow-[0_24px_60px_rgba(15,23,42,0.38)] backdrop-blur-[18px] md:px-5"
        style="background: linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(17,24,39,0.98) 100%);"
      >
        <div class="grid gap-[0.75rem]">
          <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div class="grid gap-[0.2rem] min-w-0">
              <strong class="text-[0.96rem] leading-tight tracking-[-0.02em]">{{ stickyScanTitle }}</strong>
              <p class="m-0 text-[0.84rem] leading-[1.45] text-white/75">{{ stickyScanSummary }}</p>
            </div>
            <span
              class="inline-flex items-center justify-center min-h-8 px-[0.72rem] py-[0.34rem] rounded-full text-[0.73rem] font-bold whitespace-nowrap text-[#dbeafe]"
              style="background: rgba(78, 197, 255, 0.16);"
            >
              {{ stickyScanPhaseLabel }}
            </span>
          </div>

          <div
            class="relative h-[0.72rem] overflow-hidden rounded-full"
            style="background: rgba(255, 255, 255, 0.12);"
            aria-hidden="true"
          >
            <div
              class="absolute inset-y-0 left-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
              style="background: linear-gradient(90deg, #38bdf8 0%, #4ec5ff 48%, #f8fafc 100%);"
              :style="{ width: `${stickyScanProgressPercent}%` }"
            />
          </div>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.82rem] text-white/72">
            <span>{{ stickyScanMetricLine }}</span>
            <span v-if="stickyScanCurrentFolder" class="min-w-0 truncate">Current: {{ stickyScanCurrentFolder }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import SidebarNav from './SidebarNav.vue';
import TopNav from './TopNav.vue';

import { useAppStore } from '../stores/app';
import type { ScanProgress } from '../types/api';

const appStore = useAppStore();
const route = useRoute();
const isExploreShell = computed(() => route.meta.shell === 'explore');
const activeScan = computed(() => appStore.stats?.scan ?? null);
const showStickyScanStatus = computed(() => Boolean(activeScan.value?.isScanning));

function calculateProgressPercent(progress: ScanProgress | null) {
  if (!progress?.isScanning) {
    return 0;
  }

  const discoveryTotal = progress.discoveredFolders + progress.discoveredImages;
  const discoveryDone = progress.processedFolders + progress.processedImages;
  const discoveryRatio = discoveryTotal > 0 ? discoveryDone / discoveryTotal : 0;

  if (progress.phase === 'discovery') {
    return Math.round(Math.min(92, Math.max(8, discoveryRatio * 78)));
  }

  if (progress.queuedDerivativeJobs === 0) {
    return 100;
  }

  const derivativeRatio = progress.processedDerivativeJobs / progress.queuedDerivativeJobs;
  return Math.round(Math.min(99, 78 + derivativeRatio * 22));
}

const stickyScanTitle = computed(() => {
  if (activeScan.value?.scanReason === 'rebuild') {
    return 'Rebuilding library';
  }

  if (activeScan.value?.scanReason === 'rebuild-thumbnails') {
    return 'Regenerating thumbnails';
  }

  return 'Scanning library';
});

const stickyScanPhaseLabel = computed(() => {
  if (!activeScan.value?.isScanning) {
    return 'Idle';
  }

  return activeScan.value.phase === 'derivatives' ? 'Derivatives' : 'Discovery';
});

const stickyScanSummary = computed(() => {
  const scan = activeScan.value;
  if (!scan) {
    return '';
  }

  if (scan.scanReason === 'rebuild-thumbnails') {
    if (scan.phase === 'discovery' && scan.discoveredImages === 0) {
      return 'Preparing indexed media for thumbnail regeneration.';
    }

    return scan.phase === 'derivatives'
      ? 'Rebuilding feed and profile thumbnails plus video posters from indexed media.'
      : 'Loading indexed media before thumbnail regeneration starts.';
  }

  if (scan.scanReason === 'rebuild') {
    if (scan.phase === 'discovery' && scan.discoveredFolders === 0 && scan.discoveredImages === 0) {
      return 'Resetting the library index and preparing the current gallery root.';
    }

    return scan.phase === 'derivatives'
      ? 'Reusing existing thumbnails and previews where possible, then generating any missing derivatives.'
      : 'Rebuilding folders and indexed posts from the active gallery root.';
  }

  if (scan.phase === 'discovery' && scan.discoveredFolders === 0 && scan.discoveredImages === 0) {
    return 'Walking the library tree to find media folders before indexing starts.';
  }

  return scan.phase === 'derivatives'
    ? 'Generating thumbnails and previews for queued changes.'
    : 'Scanning folders and indexing any changes found in the library.';
});

const stickyScanMetricLine = computed(() => {
  const scan = activeScan.value;
  if (!scan) {
    return '';
  }

  const progressLabel = scan.scanReason === 'rebuild-thumbnails' ? 'processed' : 'indexed';
  const totalImages = scan.discoveredImages || '?';
  return `${scan.processedImages}/${totalImages} ${progressLabel} | ${scan.generatedThumbnails} thumbnails | ${scan.generatedPreviews} previews`;
});

const stickyScanCurrentFolder = computed(() => activeScan.value?.currentFolder ?? null);
const stickyScanProgressPercent = computed(() => calculateProgressPercent(activeScan.value));
</script>
