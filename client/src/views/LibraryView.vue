<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.2rem]">
    <header class="flex items-end justify-between gap-4 pb-[0.8rem] max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">Library</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">All folders</h1>
        <p class="m-0 text-muted">Browse every indexed folder, search by name or path, and filter what shows up in Foldergram.</p>
      </div>
      <p class="m-0 text-[0.9rem] font-bold">{{ formatCount(filteredProfiles.length) }} of {{ formatCount(profilesStore.items.length) }} folders</p>
    </header>

    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <ErrorState
      v-else-if="profilesStore.listError && profilesStore.items.length === 0"
      title="Could not load folders"
      :message="profilesStore.listError"
    />
    <template v-else>
      <!-- Toolbar card -->
      <section class="card grid gap-4 p-8">
        <!-- Search -->
        <div class="grid gap-[0.45rem]">
          <label class="text-muted text-[0.76rem] font-bold tracking-[0.08em] uppercase" for="library-search">Search folders</label>
          <input
            id="library-search"
            v-model.trim="searchQuery"
            class="w-full min-h-12 px-4 py-[0.85rem] border border-border rounded-[0.95rem] text-text bg-[color-mix(in_srgb,var(--surface-alt)_86%,var(--surface)_14%)] transition-[border-color,box-shadow,background-color] duration-180 focus:outline-none focus:border-[color-mix(in_srgb,var(--accent)_56%,var(--border)_44%)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-soft)_85%,transparent_15%)]"
            type="search"
            placeholder="Search by slug, folder name, or path"
          />
        </div>

        <!-- Controls row -->
        <div class="flex flex-wrap items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
          <div class="inline-flex flex-wrap gap-[0.55rem]" aria-label="Folder filters">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              class="min-h-[2.7rem] px-[0.95rem] py-[0.65rem] border border-border rounded-full text-muted bg-[color-mix(in_srgb,var(--surface-alt)_92%,var(--surface)_8%)] cursor-pointer transition-[border-color,background-color,color,transform] duration-180 hover:-translate-y-px"
              :class="statusFilter === option.value ? 'border-[color-mix(in_srgb,var(--accent)_58%,var(--border)_42%)] text-accent-strong bg-[color-mix(in_srgb,var(--accent-soft)_82%,var(--surface)_18%)]' : ''"
              type="button"
              @click="statusFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <label class="grid gap-[0.45rem] min-w-[13.5rem] max-sm:w-full max-sm:min-w-0">
            <span class="text-muted text-[0.76rem] font-bold tracking-[0.08em] uppercase">Sort</span>
            <select v-model="sortMode" class="w-full min-h-12 px-4 py-[0.85rem] border border-border rounded-[0.95rem] text-text bg-[color-mix(in_srgb,var(--surface-alt)_86%,var(--surface)_14%)] focus:outline-none">
              <option value="images-desc">Most images</option>
              <option value="name-asc">Folder name A-Z</option>
              <option value="name-desc">Folder name Z-A</option>
              <option value="slug-asc">Handle A-Z</option>
            </select>
          </label>
        </div>

        <!-- Summary stats -->
        <dl class="grid grid-cols-4 gap-[0.8rem] m-0 max-sm:grid-cols-1">
          <div class="px-[0.95rem] py-[0.85rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Total folders</dt>
            <dd class="m-0 text-base font-bold">{{ formatCount(profilesStore.items.length) }}</dd>
          </div>
          <div class="px-[0.95rem] py-[0.85rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">With images</dt>
            <dd class="m-0 text-base font-bold">{{ formatCount(activeFolderCount) }}</dd>
          </div>
          <div class="px-[0.95rem] py-[0.85rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Empty folders</dt>
            <dd class="m-0 text-base font-bold">{{ formatCount(emptyFolderCount) }}</dd>
          </div>
          <div class="px-[0.95rem] py-[0.85rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
            <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">Indexed images</dt>
            <dd class="m-0 text-base font-bold">{{ formatCount(totalIndexedImages) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="profilesStore.loadingList && profilesStore.items.length === 0" class="card p-8 text-center">
        <h2 class="text-text">Loading folders</h2>
        <p class="m-0 text-muted">Reading the indexed library so every folder can be searched and filtered here.</p>
      </section>

      <EmptyState
        v-else-if="profilesStore.items.length === 0"
        title="No folders indexed yet"
        description="Add folders to the gallery root and run a scan to populate the library."
      />

      <section v-else-if="filteredProfiles.length === 0" class="card p-8 text-center">
        <h2 class="text-text">No folders match</h2>
        <p class="m-0 text-muted">Try a broader search or switch back to a different filter.</p>
      </section>

      <!-- Library grid -->
      <section v-else class="grid grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1" aria-label="All folders">
        <RouterLink
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="grid gap-[0.9rem] p-4 border border-border rounded-[1rem] bg-[linear-gradient(180deg,var(--surface)_0%,color-mix(in_srgb,var(--surface)_92%,var(--accent)_8%)_100%)] shadow-[var(--shadow)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent)_38%,var(--border)_62%)] hover:shadow-[0_18px_36px_rgba(15,20,25,0.1)]"
          :to="{ name: 'profile', params: { slug: profile.slug } }"
        >
          <div class="flex items-center gap-[0.8rem] max-sm:flex-col max-sm:items-start">
            <Avatar class="w-12 h-12" :name="profile.name" :src="profile.avatarUrl" />
            <div class="min-w-0 flex-1">
              <h2 class="m-0 text-[0.96rem] font-bold">{{ profile.slug }}</h2>
              <p class="m-0 text-muted text-[0.8rem]">{{ profile.name }}</p>
            </div>
            <span class="max-sm:ml-0 ml-auto px-[0.65rem] py-[0.3rem] rounded-full text-accent-strong bg-[color-mix(in_srgb,var(--accent-soft)_80%,var(--surface)_20%)] text-[0.74rem] font-bold whitespace-nowrap">{{ formatCount(profile.imageCount) }} posts</span>
          </div>

          <p class="m-0 text-muted text-[0.83rem] break-words">{{ profile.folderPath }}</p>

          <div class="flex items-center justify-between gap-3 pt-[0.15rem] text-muted text-[0.8rem] max-sm:flex-col max-sm:items-start">
            <span>{{ profile.imageCount > 0 ? 'Indexed and ready' : 'Indexed, awaiting images' }}</span>
            <span class="text-accent-strong font-bold">Open folder</span>
          </div>
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
