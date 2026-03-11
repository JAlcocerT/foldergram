<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.2rem]">
    <header class="flex items-end justify-between gap-4 pb-[0.8rem] max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">Settings</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">Library Controls</h1>
        <p class="m-0 text-muted">Run a manual scan, watch live progress, and keep Foldergram in sync with your folders.</p>
      </div>
    </header>

    <section class="grid grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.95fr)] gap-6 items-start max-md:grid-cols-1">
      <!-- Left: Scan controls -->
      <div class="flex flex-col gap-[1.15rem]">
        <section class="card grid gap-[1.15rem] p-8" style="background: radial-gradient(circle at top right, rgba(0,149,246,0.15), transparent 40%), linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 90%, var(--accent) 10%) 100%);">
          <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">Scan Library</h2>
              <p class="m-0 text-muted">Use a manual scan after adding folders or when you want a full derivative repair pass.</p>
            </div>
            <span
              class="inline-flex items-center justify-center min-h-8 px-[0.7rem] py-[0.35rem] rounded-full text-[0.76rem] font-bold whitespace-nowrap"
              :class="{
                'text-muted bg-surface-alt': statusTone === 'idle',
                'text-accent-strong bg-[color-mix(in_srgb,var(--accent-soft)_78%,transparent_22%)]': statusTone === 'active',
                'text-[#b76e00] bg-[rgba(242,164,30,0.14)]': statusTone === 'warning',
                'text-[#c0392b] bg-[rgba(214,48,49,0.12)]': statusTone === 'danger',
              }"
            >{{ statusLabel }}</span>
          </div>

          <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
            <button
              class="btn-primary min-w-[11.5rem]"
              type="button"
              :disabled="scanActionDisabled"
              @click="runManualScan"
            >
              {{ scanButtonLabel }}
            </button>
            <p class="m-0 text-muted">{{ scanActionNote }}</p>
          </div>

          <!-- Progress bar -->
          <div
            class="relative h-[0.88rem] overflow-hidden rounded-full"
            style="background: color-mix(in srgb, var(--surface-alt) 82%, var(--accent) 18%)"
            role="progressbar"
            aria-label="Scan progress"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="progressPercent"
          >
            <div
              class="settings-progress__fill absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--accent)_0%,#4ec5ff_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>

          <p class="m-0 text-muted">{{ progressDescription }}</p>

          <!-- Metrics grid -->
          <dl class="grid grid-cols-2 gap-[0.8rem] m-0 max-sm:grid-cols-1">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Phase</dt>
              <dd class="m-0 text-base font-bold">{{ phaseLabel }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Folders</dt>
              <dd class="m-0 text-base font-bold">{{ folderMetric }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Images</dt>
              <dd class="m-0 text-base font-bold">{{ imageMetric }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Derivatives</dt>
              <dd class="m-0 text-base font-bold">{{ derivativeMetric }}</dd>
            </div>
          </dl>

          <p v-if="scanError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ scanError }}</p>
        </section>
      </div>

      <!-- Right: Status cards -->
      <aside class="flex flex-col gap-[1.15rem]">
        <section class="card grid gap-[1.15rem] p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">Library Status</h2>
              <p class="m-0 text-muted">Current storage and index state.</p>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-[0.8rem] m-0">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Storage</dt>
              <dd class="m-0 text-base font-bold">{{ storageLabel }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Folders</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.profiles ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Indexed images</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.indexedImages ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Previews</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.previewCount ?? 0) }}</dd>
            </div>
          </dl>
        </section>

        <section class="card grid gap-[1.15rem] p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">Last Scan</h2>
              <p class="m-0 text-muted">Most recent completed run tracked by the app.</p>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-[0.8rem] m-0">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Status</dt>
              <dd class="m-0 text-base font-bold">{{ lastScanStatus }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Finished</dt>
              <dd class="m-0 text-base font-bold">{{ lastScanFinishedAt }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Files scanned</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(lastCompletedScan?.scanned_files ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Changes</dt>
              <dd class="m-0 text-base font-bold">{{ lastScanChangeSummary }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { triggerManualScan } from '../api/gallery';
import { useAppStore } from '../stores/app';
import { useFeedStore } from '../stores/feed';
import { useProfilesStore } from '../stores/profiles';

const appStore = useAppStore();
const feedStore = useFeedStore();
const profilesStore = useProfilesStore();
const scanError = ref<string | null>(null);
const requestingScan = ref(false);

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

const scan = computed(() => appStore.stats?.scan ?? null);
const lastCompletedScan = computed(() => scan.value?.lastCompletedScan ?? appStore.stats?.lastScan ?? null);
const scanActionDisabled = computed(() => appStore.isLibraryUnavailable || appStore.isScanning || requestingScan.value);
const statusTone = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return 'danger';
  }

  if (appStore.isScanning || requestingScan.value) {
    return 'active';
  }

  if (lastCompletedScan.value?.status === 'completed_with_errors') {
    return 'warning';
  }

  return 'idle';
});
const statusLabel = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return 'Storage unavailable';
  }

  if (appStore.isScanning || requestingScan.value) {
    return 'Scan in progress';
  }

  return 'Ready';
});
const scanButtonLabel = computed(() => {
  if (appStore.isScanning) {
    return 'Scanning now...';
  }

  if (requestingScan.value) {
    return 'Starting scan...';
  }

  return 'Run Manual Scan';
});
const scanActionNote = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (appStore.isScanning) {
    return 'Live progress updates below while the current scan runs.';
  }

  return 'Manual scans recheck the library and repair missing thumbnails or previews when needed.';
});
const phaseLabel = computed(() => {
  if (appStore.isScanning || requestingScan.value) {
    return scan.value?.phase === 'derivatives' ? 'Derivatives' : 'Discovery';
  }

  return 'Idle';
});
const folderMetric = computed(() => `${scan.value?.processedFolders ?? 0}/${scan.value?.discoveredFolders ?? 0}`);
const imageMetric = computed(() => `${scan.value?.processedImages ?? 0}/${scan.value?.discoveredImages ?? 0}`);
const derivativeMetric = computed(() => `${scan.value?.processedDerivativeJobs ?? 0}/${scan.value?.queuedDerivativeJobs ?? 0}`);
const progressPercent = computed(() => {
  if (!scan.value) {
    return 0;
  }

  if (!scan.value.isScanning) {
    return lastCompletedScan.value ? 100 : 0;
  }

  const discoveryTotal = scan.value.discoveredFolders + scan.value.discoveredImages;
  const discoveryDone = scan.value.processedFolders + scan.value.processedImages;
  const discoveryRatio = discoveryTotal > 0 ? discoveryDone / discoveryTotal : 0;

  if (scan.value.phase === 'discovery') {
    return Math.round(Math.min(92, Math.max(8, discoveryRatio * 78)));
  }

  if (scan.value.queuedDerivativeJobs === 0) {
    return 100;
  }

  const derivativeRatio = scan.value.processedDerivativeJobs / scan.value.queuedDerivativeJobs;
  return Math.round(Math.min(99, 78 + derivativeRatio * 22));
});
const progressDescription = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (!scan.value) {
    return 'Preparing scan status...';
  }

  if (!scan.value.isScanning && !requestingScan.value) {
    return 'Manual scans use the same indexed pipeline as startup, with a full derivative repair pass when needed.';
  }

  const currentFolder = scan.value.currentFolder ? ` Current folder: ${scan.value.currentFolder}.` : '';
  if (scan.value.phase === 'derivatives') {
    return scan.value.queuedDerivativeJobs > 0
      ? `Generating thumbnails and previews for queued changes.${currentFolder}`
      : `Finishing the current scan.${currentFolder}`;
  }

  return `Scanning folders and indexing any changes found in the library.${currentFolder}`;
});
const storageLabel = computed(() => (appStore.isLibraryUnavailable ? 'Unavailable' : 'Available'));
const lastScanStatus = computed(() => {
  if (!lastCompletedScan.value) {
    return 'No completed scans yet';
  }

  return lastCompletedScan.value.status.replaceAll('_', ' ');
});
const lastScanFinishedAt = computed(() => formatDateTime(lastCompletedScan.value?.finished_at));
const lastScanChangeSummary = computed(() => {
  if (!lastCompletedScan.value) {
    return '0 new · 0 updated · 0 removed';
  }

  return `${lastCompletedScan.value.new_files} new · ${lastCompletedScan.value.updated_files} updated · ${lastCompletedScan.value.removed_files} removed`;
});

async function warmScanStatus() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await wait(attempt === 0 ? 150 : 250);

    try {
      await appStore.fetchStats({ background: true });
    } catch {
      // The rescan request may win the race; keep polling until scan state flips or the request finishes.
    }

    if (appStore.stats?.scan.isScanning) {
      return;
    }
  }
}

async function runManualScan() {
  if (scanActionDisabled.value) {
    return;
  }

  requestingScan.value = true;
  scanError.value = null;

  try {
    const request = triggerManualScan();
    await warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([profilesStore.fetchProfiles(true), feedStore.loadInitial(true)]);
  } catch (error) {
    scanError.value = error instanceof Error ? error.message : 'Unable to start a manual scan.';
  } finally {
    requestingScan.value = false;
  }
}

onMounted(async () => {
  if (!appStore.stats && !appStore.loadingStats) {
    await appStore.fetchStats();
  }
});
</script>
