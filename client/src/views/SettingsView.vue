<template>
  <section class="content-column content-column--wide stack">
    <header class="page-header">
      <div>
        <span class="eyebrow">Settings</span>
        <h1>Library Controls</h1>
        <p>Run a manual scan, watch live progress, and keep Foldergram in sync with your folders.</p>
      </div>
    </header>

    <section class="settings-layout">
      <div class="stack">
        <section class="panel settings-card settings-card--primary">
          <div class="settings-card__header">
            <div>
              <h2>Scan Library</h2>
              <p>Use a manual scan after adding folders or when you want a full derivative repair pass.</p>
            </div>
            <span :class="['settings-status', `settings-status--${statusTone}`]">{{ statusLabel }}</span>
          </div>

          <div class="settings-actions">
            <button
              class="profile-header__button settings-actions__button"
              type="button"
              :disabled="scanActionDisabled"
              @click="runManualScan"
            >
              {{ scanButtonLabel }}
            </button>
            <p class="settings-note">
              {{ scanActionNote }}
            </p>
          </div>

          <div
            class="settings-progress"
            role="progressbar"
            aria-label="Scan progress"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="progressPercent"
          >
            <div class="settings-progress__fill" :style="{ width: `${progressPercent}%` }" />
          </div>

          <p class="settings-progress__caption">{{ progressDescription }}</p>

          <dl class="settings-metrics">
            <div>
              <dt>Phase</dt>
              <dd>{{ phaseLabel }}</dd>
            </div>
            <div>
              <dt>Folders</dt>
              <dd>{{ folderMetric }}</dd>
            </div>
            <div>
              <dt>Images</dt>
              <dd>{{ imageMetric }}</dd>
            </div>
            <div>
              <dt>Derivatives</dt>
              <dd>{{ derivativeMetric }}</dd>
            </div>
          </dl>

          <p v-if="scanError" class="settings-inline-error">{{ scanError }}</p>
        </section>
      </div>

      <aside class="stack">
        <section class="panel settings-card">
          <div class="settings-card__header">
            <div>
              <h2>Library Status</h2>
              <p>Current storage and index state.</p>
            </div>
          </div>

          <dl class="settings-facts">
            <div>
              <dt>Storage</dt>
              <dd>{{ storageLabel }}</dd>
            </div>
            <div>
              <dt>Folders</dt>
              <dd>{{ formatCount(appStore.stats?.profiles ?? 0) }}</dd>
            </div>
            <div>
              <dt>Indexed images</dt>
              <dd>{{ formatCount(appStore.stats?.indexedImages ?? 0) }}</dd>
            </div>
            <div>
              <dt>Previews</dt>
              <dd>{{ formatCount(appStore.stats?.previewCount ?? 0) }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel settings-card">
          <div class="settings-card__header">
            <div>
              <h2>Last Scan</h2>
              <p>Most recent completed run tracked by the app.</p>
            </div>
          </div>

          <dl class="settings-facts">
            <div>
              <dt>Status</dt>
              <dd>{{ lastScanStatus }}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{{ lastScanFinishedAt }}</dd>
            </div>
            <div>
              <dt>Files scanned</dt>
              <dd>{{ formatCount(lastCompletedScan?.scanned_files ?? 0) }}</dd>
            </div>
            <div>
              <dt>Changes</dt>
              <dd>{{ lastScanChangeSummary }}</dd>
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
