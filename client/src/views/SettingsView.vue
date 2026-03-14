<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.2rem]">
    <header class="flex items-end justify-between gap-4 pb-[0.8rem] max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">Settings</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">Library Controls</h1>
        <p class="m-0 text-muted">Run scans, refresh thumbnails, or reset the library index.</p>
      </div>
    </header>

    <section
      v-if="showScanErrorNotice"
      class="card grid gap-[1rem] p-8 border-[color-mix(in_srgb,#d2a133_45%,var(--border)_55%)]"
      style="background: radial-gradient(circle at top right, rgba(210,161,51,0.18), transparent 42%), linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, #fff4d1 8%) 0%, color-mix(in srgb, var(--surface) 86%, #ffeab1 14%) 100%);"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="grid gap-[0.35rem]">
          <span class="eyebrow text-[#9f6a00]">Scan Needs Attention</span>
          <h2 class="m-0 text-[1.1rem]">The last scan completed with errors</h2>
          <p class="m-0 text-muted">{{ scanErrorNoticeMessage }}</p>
        </div>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[rgba(159,106,0,0.08)] text-[#9f6a00] cursor-pointer transition-colors duration-180 hover:bg-[rgba(159,106,0,0.14)]"
          type="button"
          aria-label="Dismiss scan warning"
          @click="dismissScanErrorNotice"
        >
          <span class="i-fluent-dismiss-20-filled h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
        <button class="btn-primary min-w-[11.5rem]" type="button" :disabled="scanActionDisabled" @click="runManualScan">
          {{ scanButtonLabel }}
        </button>
        <p class="m-0 text-muted">Run a new library scan to retry failed media and fill in any missing thumbnails or previews.</p>
      </div>
    </section>

    <section class="grid grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.95fr)] gap-6 items-start max-md:grid-cols-1">
      <!-- Left: Scan controls -->
      <div class="flex flex-col gap-[1.15rem]">
        <section class="card grid gap-[1.15rem] p-8" style="background: radial-gradient(circle at top right, rgba(0,149,246,0.15), transparent 40%), linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 90%, var(--accent) 10%) 100%);">
          <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">Scan Library</h2>
              <p class="m-0 text-muted">Run a scan after adding folders or when you want to refresh indexed media.</p>
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

          <p v-if="scanError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ scanError }}</p>
        </section>

        <section
          class="card grid gap-[1rem] p-8"
          :class="highlightRebuildAction ? 'ring-2 ring-[color-mix(in_srgb,var(--accent)_45%,transparent_55%)]' : ''"
          :style="rebuildCardStyle"
        >
          <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">Rebuild Library</h2>
              <p class="m-0 text-muted">Refresh thumbnails or reset the library index from the current gallery root.</p>
            </div>
            <span
              class="inline-flex items-center justify-center min-h-8 px-[0.7rem] py-[0.35rem] rounded-full text-[0.76rem] font-bold whitespace-nowrap"
              :class="appStore.isLibraryRebuildRequired ? 'text-[#9f6a00] bg-[rgba(210,161,51,0.14)]' : 'text-muted bg-surface-alt'"
            >
              {{ appStore.isLibraryRebuildRequired ? 'Recommended' : 'Optional' }}
            </span>
          </div>

          <dl class="grid gap-[0.8rem] m-0">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 92%, var(--accent) 8%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Current gallery root</dt>
              <dd class="m-0 text-[0.92rem] font-semibold break-all">{{ appStore.stats?.libraryIndex.currentGalleryRoot ?? 'Unavailable' }}</dd>
            </div>
            <div v-if="appStore.stats?.libraryIndex.previousGalleryRoot" class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 92%, #d2a133 8%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Previous gallery root</dt>
              <dd class="m-0 text-[0.92rem] font-semibold break-all">{{ appStore.stats.libraryIndex.previousGalleryRoot }}</dd>
            </div>
          </dl>

          <div class="grid gap-[1rem]">
            <section class="grid gap-[0.7rem]">
              <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
                <button class="btn-primary min-w-[13rem]" type="button" :disabled="thumbnailRebuildActionDisabled" @click="confirmThumbnailRebuildOpen = true">
                  {{ thumbnailRebuildButtonLabel }}
                </button>
                <p class="m-0 text-muted">
                  Rebuild feed and profile thumbnails plus video posters from indexed media only.
                </p>
              </div>
              <p class="m-0 text-muted">{{ thumbnailRebuildActionNote }}</p>
              <p v-if="thumbnailRebuildError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ thumbnailRebuildError }}</p>
            </section>

            <section class="grid gap-[0.7rem]">
              <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
                <button class="btn-primary min-w-[13rem]" type="button" :disabled="rebuildActionDisabled" @click="confirmRebuildOpen = true">
                  {{ rebuildButtonLabel }}
                </button>
                <p class="m-0 text-muted">
                  Reset the library index, reuse matching cached media, and generate only missing derivatives from the current gallery root.
                </p>
              </div>
              <p class="m-0 text-muted">{{ rebuildActionNote }}</p>
              <p v-if="rebuildError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ rebuildError }}</p>
            </section>
          </div>
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
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.folders ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Indexed posts</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.indexedImages ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Indexed videos</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.indexedVideos ?? 0) }}</dd>
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
              <dd class="m-0 text-base font-bold whitespace-pre-line">{{ lastScanChangeSummary }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </section>

    <ConfirmDialog
      v-if="confirmRebuildOpen"
      title="Rebuild the current library index?"
      message="This will clear the indexed database tables for folders, posts, likes, and scan history, then rescan the active gallery root. Existing thumbnails and previews at the configured storage paths will be reused when their mirrored files already exist, and only missing derivatives will be generated. Original files in the gallery will not be deleted."
      confirm-label="Rebuild Library Index"
      loading-label="Rebuilding..."
      :loading="rebuilding"
      @cancel="confirmRebuildOpen = false"
      @confirm="runLibraryRebuild"
    />
    <ConfirmDialog
      v-if="confirmThumbnailRebuildOpen"
      title="Regenerate thumbnails only?"
      message="This will remove generated feed and profile thumbnails plus video poster images, then rebuild them from the current indexed library. Previews, likes, scan history, and indexed library records will not be changed. Original files in the gallery will not be deleted."
      confirm-label="Regenerate Thumbnails"
      loading-label="Regenerating..."
      :loading="rebuildingThumbnails"
      @cancel="confirmThumbnailRebuildOpen = false"
      @confirm="runThumbnailRebuild"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import ConfirmDialog from '../components/ConfirmDialog.vue';
import { triggerLibraryRebuild, triggerManualScan, triggerThumbnailRebuild } from '../api/gallery';
import { useAppStore } from '../stores/app';
import { useFeedStore } from '../stores/feed';
import { useFoldersStore } from '../stores/folders';
import { useLikesStore } from '../stores/likes';
import { useMomentsStore } from '../stores/moments';
import { useViewerStore } from '../stores/viewer';

const appStore = useAppStore();
const feedStore = useFeedStore();
const foldersStore = useFoldersStore();
const likesStore = useLikesStore();
const momentsStore = useMomentsStore();
const viewerStore = useViewerStore();
const route = useRoute();
const scanError = ref<string | null>(null);
const rebuildError = ref<string | null>(null);
const thumbnailRebuildError = ref<string | null>(null);
const requestingScan = ref(false);
const rebuilding = ref(false);
const rebuildingThumbnails = ref(false);
const confirmRebuildOpen = ref(false);
const confirmThumbnailRebuildOpen = ref(false);
const SCAN_ERROR_NOTICE_STORAGE_KEY = 'foldergram-scan-error-notice-dismissal';
const SCAN_ERROR_NOTICE_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function loadDismissedScanErrorNotice(): { scanId: number; dismissedUntil: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(SCAN_ERROR_NOTICE_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { scanId?: unknown; dismissedUntil?: unknown };
    if (
      typeof parsed.scanId !== 'number' ||
      !Number.isFinite(parsed.scanId) ||
      typeof parsed.dismissedUntil !== 'number' ||
      !Number.isFinite(parsed.dismissedUntil)
    ) {
      return null;
    }

    return {
      scanId: parsed.scanId,
      dismissedUntil: parsed.dismissedUntil
    };
  } catch {
    return null;
  }
}

const dismissedScanErrorNotice = ref(loadDismissedScanErrorNotice());

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
const activeScanReason = computed(() => scan.value?.scanReason ?? null);
const isLibraryRebuildActive = computed(
  () => rebuilding.value || (appStore.isScanning && activeScanReason.value === 'rebuild')
);
const isThumbnailRebuildActive = computed(
  () => rebuildingThumbnails.value || (appStore.isScanning && activeScanReason.value === 'rebuild-thumbnails')
);
const isRebuildOperationActive = computed(() => isLibraryRebuildActive.value || isThumbnailRebuildActive.value);
const scanProgressActive = computed(() => requestingScan.value || Boolean(scan.value?.isScanning && !isRebuildOperationActive.value));
const highlightRebuildAction = computed(() => route.query.action === 'rebuild');
const waitingForInitialStatus = computed(() => !appStore.stats || appStore.loadingStats);
const scanActionDisabled = computed(
  () =>
    waitingForInitialStatus.value ||
    appStore.isLibraryUnavailable ||
    appStore.isLibraryRebuildRequired ||
    appStore.isScanning ||
    requestingScan.value ||
    rebuilding.value ||
    rebuildingThumbnails.value
);
const rebuildActionDisabled = computed(
  () =>
    waitingForInitialStatus.value ||
    appStore.isLibraryUnavailable ||
    appStore.isScanning ||
    requestingScan.value ||
    rebuilding.value ||
    rebuildingThumbnails.value
);
const thumbnailRebuildActionDisabled = computed(
  () =>
    waitingForInitialStatus.value ||
    appStore.isLibraryUnavailable ||
    appStore.isLibraryRebuildRequired ||
    appStore.isScanning ||
    requestingScan.value ||
    rebuilding.value ||
    rebuildingThumbnails.value
);
const rebuildCardStyle = computed(() =>
  appStore.isLibraryRebuildRequired
    ? 'background: radial-gradient(circle at top right, rgba(210,161,51,0.2), transparent 42%), linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 88%, #fff3c3 12%) 100%);'
    : 'background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, var(--accent) 4%) 0%, var(--surface) 100%);'
);
const statusTone = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return 'danger';
  }

  if (scanProgressActive.value || isRebuildOperationActive.value) {
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

  if (scanProgressActive.value) {
    return 'Scan in progress';
  }

  if (isRebuildOperationActive.value) {
    return 'Rebuild active';
  }

  return 'Ready';
});
const scanButtonLabel = computed(() => {
  if (scanProgressActive.value) {
    return 'Scanning library...';
  }

  return 'Run Scan Library';
});
const scanActionNote = computed(() => {
  if (waitingForInitialStatus.value) {
    return 'Loading current library status...';
  }

  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (appStore.isLibraryRebuildRequired) {
    return 'Rebuild the library index first because the gallery location changed.';
  }

  if (isRebuildOperationActive.value) {
    return 'Another library task is running. Live progress appears in the sticky status bar.';
  }

  if (scanProgressActive.value) {
    return 'Live progress appears in the sticky status bar.';
  }

  return 'Scans check for added, updated, or missing media.';
});
const rebuildButtonLabel = computed(() => {
  if (isLibraryRebuildActive.value) {
    return 'Rebuilding now...';
  }

  return 'Rebuild Library Index';
});
const thumbnailRebuildButtonLabel = computed(() => {
  if (isThumbnailRebuildActive.value) {
    return 'Regenerating now...';
  }

  return 'Regenerate Thumbnails';
});
const rebuildActionNote = computed(() => {
  if (waitingForInitialStatus.value) {
    return 'Loading current library status...';
  }

  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (isLibraryRebuildActive.value) {
    return 'Live progress appears in the sticky status bar.';
  }

  if (isThumbnailRebuildActive.value) {
    return 'Wait for thumbnail regeneration to finish first.';
  }

  if (appStore.isScanning) {
    return 'Wait for the current scan to finish first.';
  }

  if (appStore.isLibraryRebuildRequired) {
    return 'Recommended because the gallery location changed.';
  }

  return 'Use this to reset the index and reuse any existing derivatives at the current storage paths.';
});
const thumbnailRebuildActionNote = computed(() => {
  if (waitingForInitialStatus.value) {
    return 'Loading current library status...';
  }

  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (appStore.isLibraryRebuildRequired) {
    return 'Unavailable until the library index is rebuilt for the new gallery location.';
  }

  if (isThumbnailRebuildActive.value) {
    return 'Live progress appears in the sticky status bar.';
  }

  if (isLibraryRebuildActive.value) {
    return 'Wait for the full rebuild to finish first.';
  }

  if (appStore.isScanning) {
    return 'Wait for the current scan to finish first.';
  }

  return 'Use this for a faster thumbnail-only refresh.';
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
    return '0 new\n0 updated\n0 removed';
  }

  return `${lastCompletedScan.value.new_files} new\n${lastCompletedScan.value.updated_files} updated\n${lastCompletedScan.value.removed_files} removed`;
});
const showScanErrorNotice = computed(() => {
  if (appStore.isLibraryUnavailable || appStore.isScanning) {
    return false;
  }

  if (lastCompletedScan.value?.status !== 'completed_with_errors') {
    return false;
  }

  const dismissed = dismissedScanErrorNotice.value;
  if (!dismissed) {
    return true;
  }

  if (dismissed.scanId !== lastCompletedScan.value.id) {
    return true;
  }

  return Date.now() >= dismissed.dismissedUntil;
});
const scanErrorNoticeMessage = computed(() => {
  return 'Some media failed during the last run. Scan the library again to retry any missed files and derivative generation.';
});

function dismissScanErrorNotice() {
  const scanId = lastCompletedScan.value?.id;
  if (!scanId) {
    return;
  }

  const nextDismissal = {
    scanId,
    dismissedUntil: Date.now() + SCAN_ERROR_NOTICE_DISMISS_MS
  };

  dismissedScanErrorNotice.value = nextDismissal;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SCAN_ERROR_NOTICE_STORAGE_KEY, JSON.stringify(nextDismissal));
  }
}

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
    void warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([foldersStore.fetchFolders(true), feedStore.loadInitial(true)]);
  } catch (error) {
    scanError.value = error instanceof Error ? error.message : 'Unable to start a library scan.';
  } finally {
    requestingScan.value = false;
  }
}

async function runLibraryRebuild() {
  if (rebuildActionDisabled.value) {
    return;
  }

  rebuilding.value = true;
  rebuildError.value = null;
  confirmRebuildOpen.value = false;
  appStore.markLibraryRebuildStarted();
  feedStore.resetForRebuild();
  foldersStore.resetForRebuild();
  likesStore.resetForRebuild();
  momentsStore.resetForRebuild();
  viewerStore.reset();

  try {
    const request = triggerLibraryRebuild();
    void warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([
      foldersStore.fetchFolders(true),
      feedStore.loadInitial(true),
      likesStore.initialize(true),
      momentsStore.fetchMoments(true)
    ]);
  } catch (error) {
    rebuildError.value = error instanceof Error ? error.message : 'Unable to rebuild the current library index.';
    await appStore.fetchStats({ background: true });
  } finally {
    rebuilding.value = false;
  }
}

async function runThumbnailRebuild() {
  if (thumbnailRebuildActionDisabled.value) {
    return;
  }

  rebuildingThumbnails.value = true;
  thumbnailRebuildError.value = null;
  confirmThumbnailRebuildOpen.value = false;

  try {
    const request = triggerThumbnailRebuild();
    void warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([
      foldersStore.fetchFolders(true),
      feedStore.loadInitial(true),
      likesStore.initialize(true),
      momentsStore.fetchMoments(true)
    ]);
  } catch (error) {
    thumbnailRebuildError.value = error instanceof Error ? error.message : 'Unable to regenerate thumbnails.';
    await appStore.fetchStats({ background: true });
  } finally {
    rebuildingThumbnails.value = false;
  }
}

onMounted(async () => {
  if (!appStore.stats && !appStore.loadingStats) {
    await appStore.fetchStats();
  }
});
</script>
