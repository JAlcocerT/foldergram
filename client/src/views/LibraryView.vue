<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.4rem]">
    <!-- Page header -->
    <header class="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">Library</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">All folders</h1>
        <p class="m-0 mt-1 text-muted">Browse and search every indexed folder.</p>
      </div>
      <!-- Quick stats strip -->
      <div class="flex items-center gap-[1.4rem] shrink-0 max-sm:w-full max-sm:justify-between">
        <div class="text-center">
          <p class="m-0 text-[1.35rem] font-bold tracking-tight">{{ formatCount(profilesStore.items.length) }}</p>
          <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.08em]">Folders</p>
        </div>
        <div class="w-px h-8 bg-border"></div>
        <div class="text-center">
          <p class="m-0 text-[1.35rem] font-bold tracking-tight">{{ formatCount(totalIndexedImages) }}</p>
          <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.08em]">Images</p>
        </div>
        <div class="w-px h-8 bg-border"></div>
        <div class="text-center">
          <p class="m-0 text-[1.35rem] font-bold tracking-tight">{{ formatCount(activeFolderCount) }}</p>
          <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.08em]">Active</p>
        </div>
      </div>
    </header>

    <EmptyState v-if="appStore.isLibraryUnavailable" title="Library storage unavailable" :description="appStore.libraryUnavailableReason" />
    <ErrorState v-else-if="profilesStore.listError && profilesStore.items.length === 0" title="Could not load folders" :message="profilesStore.listError" />
    <template v-else>

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 p-[0.85rem] pl-4 bg-surface border border-border rounded-[1.1rem] shadow-[var(--shadow)]">
        <!-- Search -->
        <div class="relative flex-1 min-w-[12rem]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-[1rem] h-[1rem] text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="library-search"
            v-model.trim="searchQuery"
            class="w-full h-10 pl-9 pr-4 border border-border rounded-[0.75rem] text-text text-[0.88rem] bg-surface-alt transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent/40 focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            type="search"
            placeholder="Search folders…"
          />
        </div>

        <!-- Filter pills -->
        <div class="flex items-center gap-[0.4rem]">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            class="h-10 px-4 border rounded-[0.75rem] text-[0.82rem] font-semibold cursor-pointer transition-all duration-150"
            :class="statusFilter === option.value
              ? 'border-accent/40 text-accent-strong bg-[var(--accent-soft)]'
              : 'border-border text-muted bg-transparent hover:bg-surface-hover hover:text-text'"
            type="button"
            @click="statusFilter = option.value"
          >{{ option.label }}</button>
        </div>

        <!-- Sort -->
        <div class="relative">
          <select
            v-model="sortMode"
            class="h-10 pl-3 pr-9 border border-border rounded-[0.75rem] text-text text-[0.82rem] bg-surface-alt cursor-pointer appearance-none focus:outline-none focus:border-accent/40"
          >
            <option value="images-desc">Most images</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="slug-asc">Handle A–Z</option>
          </select>
          <svg class="pointer-events-none absolute right-[0.65rem] top-1/2 -translate-y-1/2 w-[0.85rem] h-[0.85rem] text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

        <!-- Result count -->
        <span class="ml-auto text-muted text-[0.8rem] shrink-0">{{ formatCount(filteredProfiles.length) }} result{{ filteredProfiles.length !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Loading -->
      <section v-if="profilesStore.loadingList && profilesStore.items.length === 0" class="card p-12 text-center">
        <p class="text-muted">Loading folders…</p>
      </section>

      <EmptyState v-else-if="profilesStore.items.length === 0" title="No folders indexed yet" description="Add folders to the gallery root and run a scan." />

      <section v-else-if="filteredProfiles.length === 0" class="card p-12 text-center">
        <p class="m-0 text-muted">No folders match. Try a different search or filter.</p>
      </section>

      <!-- Folder list -->
      <section v-else class="bg-surface border border-border rounded-[1.1rem] shadow-[var(--shadow)] overflow-hidden" aria-label="All folders">
        <RouterLink
          v-for="(profile, i) in filteredProfiles"
          :key="profile.id"
          class="group flex items-center gap-4 px-5 py-[0.75rem] transition-colors duration-150 hover:bg-surface-hover"
          :class="i > 0 ? 'border-t border-border' : ''"
          :to="{ name: 'profile', params: { slug: profile.slug } }"
        >
          <!-- Avatar -->
          <Avatar class="w-10 h-10 shrink-0" :name="profile.name" :src="profile.avatarUrl" />

          <!-- Name + path -->
          <div class="flex-1 min-w-0">
            <p class="m-0 text-[0.9rem] font-semibold truncate">{{ profile.slug }}</p>
            <p class="m-0 text-muted text-[0.76rem] truncate font-mono opacity-70">{{ profile.folderPath }}</p>
          </div>

          <!-- Count + status -->
          <div class="flex items-center gap-3 shrink-0 text-right">
            <span class="text-[0.82rem] font-semibold text-text tabular-nums">{{ formatCount(profile.imageCount) }}</span>
            <span
              class="w-[7px] h-[7px] rounded-full shrink-0"
              :class="profile.imageCount > 0 ? 'bg-[#1ca44e]' : 'bg-border'"
              :title="profile.imageCount > 0 ? 'Ready' : 'Empty'"
            ></span>
          </div>

          <!-- Arrow -->
          <svg class="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </RouterLink>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import Avatar from '../components/Avatar.vue';
import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import { useAppStore } from '../stores/app';
import { useProfilesStore } from '../stores/profiles';
import type { ProfileSummary } from '../types/api';

type LibraryFilter = 'all' | 'active' | 'empty';
type LibrarySort = 'images-desc' | 'name-asc' | 'name-desc' | 'slug-asc';

const filterOptions: Array<{ label: string; value: LibraryFilter }> = [
  { label: 'All folders', value: 'all' },
  { label: 'With images', value: 'active' },
  { label: 'Empty', value: 'empty' }
];

const appStore = useAppStore();
const profilesStore = useProfilesStore();
const searchQuery = ref('');
const statusFilter = ref<LibraryFilter>('all');
const sortMode = ref<LibrarySort>('images-desc');

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());
const activeFolderCount = computed(() => profilesStore.items.filter((profile) => profile.imageCount > 0).length);
const emptyFolderCount = computed(() => profilesStore.items.filter((profile) => profile.imageCount === 0).length);
const totalIndexedImages = computed(() => profilesStore.items.reduce((total, profile) => total + profile.imageCount, 0));

function matchesSearch(profile: ProfileSummary, query: string) {
  if (!query) {
    return true;
  }

  return [profile.slug, profile.name, profile.folderPath].some((value) => value.toLowerCase().includes(query));
}

function sortProfiles(left: ProfileSummary, right: ProfileSummary) {
  switch (sortMode.value) {
    case 'name-asc':
      return left.name.localeCompare(right.name);
    case 'name-desc':
      return right.name.localeCompare(left.name);
    case 'slug-asc':
      return left.slug.localeCompare(right.slug);
    case 'images-desc':
    default:
      return right.imageCount - left.imageCount || left.name.localeCompare(right.name);
  }
}

const filteredProfiles = computed(() =>
  profilesStore.items
    .filter((profile) => {
      if (statusFilter.value === 'active') {
        return profile.imageCount > 0;
      }

      if (statusFilter.value === 'empty') {
        return profile.imageCount === 0;
      }

      return true;
    })
    .filter((profile) => matchesSearch(profile, normalizedQuery.value))
    .slice()
    .sort(sortProfiles)
);

onMounted(async () => {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  await profilesStore.fetchProfiles();
});
</script>
