<template>
  <aside class="sidebar">
    <RouterLink class="sidebar__brand" to="/" aria-label="Foldergram home">
      <BrandMark />
    </RouterLink>
    <nav class="sidebar__nav">
      <RouterLink class="sidebar__link" to="/">
        <span class="sidebar__icon" aria-hidden="true">
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
        </span>
        <span class="sidebar__label">Home</span>
      </RouterLink>
      <RouterLink class="sidebar__link" :to="{ name: 'library' }">
        <span class="sidebar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M3.75 7.75A1.75 1.75 0 0 1 5.5 6h4.1a1.5 1.5 0 0 1 1.06.44l1.24 1.24a1.5 1.5 0 0 0 1.06.44h5.54a1.75 1.75 0 0 1 1.75 1.75v7.63A1.75 1.75 0 0 1 18.5 19.25h-13A1.75 1.75 0 0 1 3.75 17.5Z"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </span>
        <span class="sidebar__label">Library</span>
      </RouterLink>
      <RouterLink class="sidebar__link" :to="{ name: 'likes' }">
        <span class="sidebar__icon" aria-hidden="true">
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
        </span>
        <span class="sidebar__label">Likes</span>
        <small class="sidebar__badge sidebar__meta">{{ likesStore.items.length }}</small>
      </RouterLink>
      <RouterLink class="sidebar__link" :to="{ name: 'settings' }">
        <span class="sidebar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M12 8.75A3.25 3.25 0 1 0 15.25 12 3.25 3.25 0 0 0 12 8.75Zm0-4.5 1.03 1.94a1 1 0 0 0 .86.52h2.12l.6 2.1a1 1 0 0 0 .68.68l2.1.6v2.82l-2.1.6a1 1 0 0 0-.68.68l-.6 2.1h-2.12a1 1 0 0 0-.86.52L12 19.75l-1.03-1.94a1 1 0 0 0-.86-.52H8l-.6-2.1a1 1 0 0 0-.68-.68l-2.1-.6v-2.82l2.1-.6a1 1 0 0 0 .68-.68L8 6.71h2.11a1 1 0 0 0 .86-.52Z"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            />
          </svg>
        </span>
        <span class="sidebar__label">Settings</span>
      </RouterLink>
      <span class="sidebar__section-label sidebar__meta">Folders</span>
      <RouterLink
        v-for="profile in featuredProfiles"
        :key="profile.id"
        class="sidebar__profile"
        :to="{ name: 'profile', params: { slug: profile.slug } }"
      >
        <Avatar :name="profile.name" :src="profile.avatarUrl" />
        <span class="sidebar__profile-copy sidebar__meta">
          <strong>{{ profile.slug }}</strong>
          <small>{{ profile.imageCount }} posts</small>
        </span>
      </RouterLink>
    </nav>
    <button class="sidebar__theme" type="button" @click="appStore.toggleTheme()">
      <span class="sidebar__icon" aria-hidden="true">
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
      </span>
      <span class="sidebar__label">Theme</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useAppStore } from '../stores/app';
import { useLikesStore } from '../stores/likes';
import { useProfilesStore } from '../stores/profiles';
import Avatar from './Avatar.vue';
import BrandMark from './BrandMark.vue';

const appStore = useAppStore();
const likesStore = useLikesStore();
const profilesStore = useProfilesStore();

const featuredProfiles = computed(() => profilesStore.items.slice(0, 10));
</script>
