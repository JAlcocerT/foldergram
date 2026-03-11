<template>
  <section class="content-column content-column--wide stack">
    <header class="page-header">
      <div>
        <span class="eyebrow">Library</span>
        <h1>All folders</h1>
        <p>Browse every indexed folder, search by name or path, and filter what shows up in Foldergram.</p>
      </div>
      <p class="library-header__meta">{{ formatCount(filteredProfiles.length) }} of {{ formatCount(profilesStore.items.length) }} folders</p>
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
      <section class="panel library-toolbar">
        <div class="library-search">
          <label class="library-search__label" for="library-search">Search folders</label>
          <input
            id="library-search"
            v-model.trim="searchQuery"
            class="library-search__input"
            type="search"
            placeholder="Search by slug, folder name, or path"
          />
        </div>

        <div class="library-controls">
          <div class="library-filter-group" aria-label="Folder filters">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              class="library-filter-group__button"
              :class="{ 'library-filter-group__button--active': statusFilter === option.value }"
              type="button"
              @click="statusFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <label class="library-select">
            <span>Sort</span>
            <select v-model="sortMode" class="library-select__control">
              <option value="images-desc">Most images</option>
              <option value="name-asc">Folder name A-Z</option>
              <option value="name-desc">Folder name Z-A</option>
              <option value="slug-asc">Handle A-Z</option>
            </select>
          </label>
        </div>

        <dl class="library-summary">
          <div>
            <dt>Total folders</dt>
            <dd>{{ formatCount(profilesStore.items.length) }}</dd>
          </div>
          <div>
            <dt>With images</dt>
            <dd>{{ formatCount(activeFolderCount) }}</dd>
          </div>
          <div>
            <dt>Empty folders</dt>
            <dd>{{ formatCount(emptyFolderCount) }}</dd>
          </div>
          <div>
            <dt>Indexed images</dt>
            <dd>{{ formatCount(totalIndexedImages) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="profilesStore.loadingList && profilesStore.items.length === 0" class="panel panel--centered">
        <h2>Loading folders</h2>
        <p>Reading the indexed library so every folder can be searched and filtered here.</p>
      </section>

      <EmptyState
        v-else-if="profilesStore.items.length === 0"
        title="No folders indexed yet"
        description="Add folders to the gallery root and run a scan to populate the library."
      />

      <section v-else-if="filteredProfiles.length === 0" class="panel panel--centered">
        <h2>No folders match</h2>
        <p>Try a broader search or switch back to a different filter.</p>
      </section>

      <section v-else class="library-grid" aria-label="All folders">
        <RouterLink
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="library-card"
          :to="{ name: 'profile', params: { slug: profile.slug } }"
        >
          <div class="library-card__top">
            <Avatar :name="profile.name" :src="profile.avatarUrl" />
            <div class="library-card__title">
              <h2>{{ profile.slug }}</h2>
              <p>{{ profile.name }}</p>
            </div>
            <span class="library-card__count">{{ formatCount(profile.imageCount) }} posts</span>
          </div>

          <p class="library-card__path">{{ profile.folderPath }}</p>

          <div class="library-card__meta">
            <span>{{ profile.imageCount > 0 ? 'Indexed and ready' : 'Indexed, awaiting images' }}</span>
            <span>Open folder</span>
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
