<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.4rem]">
    <!-- Page header -->
    <header class="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">Library</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">All folders</h1>
        <p class="m-0 mt-1 text-muted">Browse and search every indexed app folder.</p>
      </div>
      <div class="flex items-center gap-[1.4rem] shrink-0 max-sm:w-full max-sm:justify-between">
        <div class="text-center">
          <p class="m-0 text-[1.35rem] font-bold tracking-tight">{{ formatCount(foldersStore.items.length) }}</p>
          <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.08em]">Folders</p>
        </div>
        <div class="w-px h-8 bg-border"></div>
        <div class="text-center">
          <p class="m-0 text-[1.35rem] font-bold tracking-tight">{{ formatCount(totalIndexedImages) }}</p>
          <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.08em]">Images</p>
        </div>
      </div>
    </header>

    <EmptyState v-if="appStore.isLibraryUnavailable" title="Library storage unavailable" :description="appStore.libraryUnavailableReason" />
    <ErrorState v-else-if="foldersStore.listError && foldersStore.items.length === 0" title="Could not load folders" :message="foldersStore.listError" />
    <template v-else>

      <div class="flex flex-wrap items-center gap-3 p-[0.85rem] pl-4 bg-surface border border-border rounded-[1.1rem] shadow-[var(--shadow)]">
        <div class="relative flex-1 min-w-[12rem]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-[1rem] h-[1rem] text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="library-search"
            v-model.trim="searchQuery"
            class="w-full h-10 pl-9 pr-4 border border-border rounded-[0.75rem] text-text text-[0.88rem] bg-surface-alt transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent/40 focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            type="search"
            placeholder="Search names or path segments…"
          />
        </div>

        <div class="relative">
          <select
            v-model="sortMode"
            class="h-10 pl-3 pr-9 border border-border rounded-[0.75rem] text-text text-[0.82rem] bg-surface-alt cursor-pointer appearance-none focus:outline-none focus:border-accent/40"
          >
            <option value="recent-desc">Recently updated</option>
            <option value="images-desc">Most images</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="path-asc">Path A–Z</option>
          </select>
          <svg class="pointer-events-none absolute right-[0.65rem] top-1/2 -translate-y-1/2 w-[0.85rem] h-[0.85rem] text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

        <span class="ml-auto text-muted text-[0.8rem] shrink-0">{{ formatCount(filteredFolders.length) }} result{{ filteredFolders.length !== 1 ? 's' : '' }}</span>
      </div>

      <section v-if="foldersStore.loadingList && foldersStore.items.length === 0" class="card p-12 text-center">
        <p class="text-muted">Loading folders…</p>
      </section>

      <EmptyState v-else-if="foldersStore.items.length === 0" title="No folders indexed yet" description="Add media-containing source folders under the gallery root and run a scan." />

      <section v-else-if="filteredFolders.length === 0" class="card p-12 text-center">
        <p class="m-0 text-muted">No folders match. Try a different search or filter.</p>
      </section>

      <section v-else class="bg-surface border border-border rounded-[1.1rem] shadow-[var(--shadow)] overflow-hidden" aria-label="All folders">
        <div
          v-for="(folder, i) in filteredFolders"
          :key="folder.id"
          class="group flex items-center gap-4 px-5 py-[0.75rem] transition-colors duration-150 hover:bg-surface-hover"
          :class="i > 0 ? 'border-t border-border' : ''"
        >
          <RouterLink class="flex items-center gap-4 flex-1 min-w-0" :to="{ name: 'folder', params: { slug: folder.slug } }">
            <Avatar class="w-10 h-10 shrink-0" :name="folder.name" :src="folder.avatarUrl" />

            <div class="flex-1 min-w-0">
              <p class="m-0 text-[0.9rem] font-semibold truncate">{{ folder.name }}</p>
              <p class="m-0 text-muted text-[0.76rem] truncate">{{ folder.breadcrumb ?? 'Top-level source folder' }}</p>
              <p class="m-0 text-muted text-[0.74rem] truncate font-mono opacity-70">{{ folder.folderPath }}</p>
            </div>
          </RouterLink>

          <div class="flex items-center gap-3 shrink-0 text-right">
            <div class="grid gap-[0.15rem] justify-items-end">
              <span class="text-[0.82rem] font-semibold text-text tabular-nums">{{ formatCount(folder.imageCount) }}</span>
              <span class="text-[0.72rem] text-muted">{{ formatLatestDate(folder.latestImageMtimeMs) }}</span>
            </div>
            <span
              class="w-[7px] h-[7px] rounded-full shrink-0"
              :class="folder.imageCount > 0 ? 'bg-[#1ca44e]' : 'bg-border'"
              :title="folder.imageCount > 0 ? 'Ready' : 'Empty'"
            ></span>
          </div>

          <button
            class="inline-flex items-center justify-center w-8 h-8 p-0 border-0 text-muted bg-transparent cursor-pointer rounded-full hover:bg-surface-alt transition-colors duration-150 shrink-0"
            type="button"
            aria-label="More options"
            @click.prevent="openMenu(folder)"
          >
            <svg class="w-[1.15rem] h-[1.15rem]" viewBox="0 0 24 24" role="presentation">
              <circle cx="12" cy="6.5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="17.5" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </section>
    </template>

    <!-- Context menu modal -->
    <div v-if="menuFolder" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/48" @click.self="menuFolder = null">
      <div class="w-[min(100%,22rem)] overflow-hidden bg-surface border border-border rounded-[1rem] shadow-[var(--shadow)]">
        <button class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 border-b border-border text-text bg-transparent cursor-pointer text-left" type="button" @click="navigateToFolder">
          <svg class="w-[1.15rem] h-[1.15rem] shrink-0" viewBox="0 0 24 24" role="presentation">
            <path
              d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>Open folder</span>
        </button>
        <button class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 border-b border-border text-[#d93025] bg-transparent cursor-pointer text-left" type="button" @click="handleDelete">
          <svg class="w-[1.15rem] h-[1.15rem] shrink-0" viewBox="0 0 24 24" role="presentation">
            <path
              d="M9 4.75h6m-8 3h10m-8.5 0v10a1.25 1.25 0 0 0 1.25 1.25h4.5A1.25 1.25 0 0 0 15.5 17.75v-10m-4 3v5m4-5v5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>Delete folder</span>
        </button>
        <button class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 text-text bg-transparent cursor-pointer text-left" type="button" @click="menuFolder = null">
          <svg class="w-[1.15rem] h-[1.15rem] shrink-0" viewBox="0 0 24 24" role="presentation">
            <path
              d="m7 7 10 10M17 7 7 17"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>Cancel</span>
        </button>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <ConfirmDialog
      v-if="confirmDeleteFolder"
      title="Delete this app folder?"
      :message="`This app folder's ${formatCount(confirmDeleteFolder.imageCount)} direct image${confirmDeleteFolder.imageCount !== 1 ? 's' : ''} will be permanently deleted from the hard drive. Child source folders are not touched.`"
      confirm-label="Delete app folder"
      loading-label="Deleting…"
      :loading="deleting"
      @cancel="confirmDeleteFolder = null"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import Avatar from '../components/Avatar.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import { deleteFolder } from '../api/gallery';
import { useAppStore } from '../stores/app';
import { useFeedStore } from '../stores/feed';
import { useLikesStore } from '../stores/likes';
import { useFoldersStore } from '../stores/folders';
import type { FolderSummary } from '../types/api';

type LibrarySort = 'recent-desc' | 'images-desc' | 'name-asc' | 'name-desc' | 'path-asc';

const appStore = useAppStore();
const feedStore = useFeedStore();
const likesStore = useLikesStore();
const foldersStore = useFoldersStore();
const router = useRouter();
const searchQuery = ref('');
const sortMode = ref<LibrarySort>('recent-desc');
const menuFolder = ref<FolderSummary | null>(null);
const confirmDeleteFolder = ref<FolderSummary | null>(null);
const deleting = ref(false);

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatLatestDate(value: number | null) {
  if (!value) {
    return 'No recent media';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());
const totalIndexedImages = computed(() => foldersStore.items.reduce((total, folder) => total + folder.imageCount, 0));

function matchesSearch(folder: FolderSummary, query: string) {
  if (!query) {
    return true;
  }

  return [folder.slug, folder.name, folder.breadcrumb ?? '', folder.folderPath].some((value) => value.toLowerCase().includes(query));
}

function sortFolders(left: FolderSummary, right: FolderSummary) {
  switch (sortMode.value) {
    case 'recent-desc':
      return (right.latestImageMtimeMs ?? 0) - (left.latestImageMtimeMs ?? 0) || left.folderPath.localeCompare(right.folderPath);
    case 'name-asc':
      return left.name.localeCompare(right.name);
    case 'name-desc':
      return right.name.localeCompare(left.name);
    case 'path-asc':
      return left.folderPath.localeCompare(right.folderPath);
    case 'images-desc':
    default:
      return right.imageCount - left.imageCount || left.name.localeCompare(right.name);
  }
}

const filteredFolders = computed(() =>
  foldersStore.items
    .filter((folder) => matchesSearch(folder, normalizedQuery.value))
    .slice()
    .sort(sortFolders)
);

function openMenu(folder: FolderSummary) {
  menuFolder.value = folder;
}

function navigateToFolder() {
  if (!menuFolder.value) {
    return;
  }

  const slug = menuFolder.value.slug;
  menuFolder.value = null;
  router.push({ name: 'folder', params: { slug } });
}

function handleDelete() {
  confirmDeleteFolder.value = menuFolder.value;
  menuFolder.value = null;
}

async function confirmDelete() {
  if (!confirmDeleteFolder.value) {
    return;
  }

  deleting.value = true;

  try {
    const result = await deleteFolder(confirmDeleteFolder.value.slug);
    foldersStore.removeFolder(result.slug);
    feedStore.removeFolderItems(result.slug);
    likesStore.removeFolderItems(result.slug);
    appStore.removeFolder(result.deletedImageCount);
    confirmDeleteFolder.value = null;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  await foldersStore.fetchFolders();
});
</script>
