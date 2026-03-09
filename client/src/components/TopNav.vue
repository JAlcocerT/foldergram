<template>
  <header class="topbar">
    <RouterLink class="topbar__brand" to="/" aria-label="Foldergram home">
      <BrandMark />
    </RouterLink>
    <div class="topbar__actions">
      <RouterLink class="topbar__icon-link" to="/" aria-label="Home">
        <svg viewBox="0 0 24 24" role="presentation">
          <path
            d="M4 10.5 12 4l8 6.5v8.25a1.25 1.25 0 0 1-1.25 1.25h-4.5V13h-4.5v7H5.25A1.25 1.25 0 0 1 4 18.75z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </RouterLink>
      <RouterLink class="topbar__icon-link" :to="{ name: 'likes' }" :aria-label="`Likes (${likesStore.items.length})`">
        <svg viewBox="0 0 24 24" role="presentation">
          <path
            d="m12 20.25-.7-.64C6.35 15.09 4 12.96 4 9.96A4.21 4.21 0 0 1 8.28 5.5c1.44 0 2.83.67 3.72 1.73.89-1.06 2.28-1.73 3.72-1.73A4.21 4.21 0 0 1 20 9.96c0 3-2.35 5.13-7.3 9.65Z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </RouterLink>
      <RouterLink
        v-if="profilesStore.items[0]"
        class="topbar__icon-link"
        :to="{ name: 'profile', params: { slug: profilesStore.items[0].slug } }"
        aria-label="Folders"
      >
        <svg viewBox="0 0 24 24" role="presentation">
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5C19 16 16 14 12 14Z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </RouterLink>
      <button class="topbar__icon-button" type="button" :aria-label="themeLabel" @click="appStore.toggleTheme()">
        <svg v-if="appStore.theme === 'light'" viewBox="0 0 24 24" role="presentation">
          <path
            d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m14.86 6.36-1.77-1.77M7.91 7.91 6.14 6.14m11.72 0-1.77 1.77M7.91 16.09l-1.77 1.77M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" role="presentation">
          <path
            d="M20 14.5A7.5 7.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useAppStore } from '../stores/app';
import { useLikesStore } from '../stores/likes';
import { useProfilesStore } from '../stores/profiles';
import BrandMark from './BrandMark.vue';

const appStore = useAppStore();
const likesStore = useLikesStore();
const profilesStore = useProfilesStore();
const themeLabel = computed(() => (appStore.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'));
</script>
