<template>
  <section class="profile-header">
    <div class="profile-header__avatar-wrap">
      <Avatar class="profile-header__avatar" :name="profile.name" :src="profile.avatarUrl" />
    </div>
    <div class="profile-header__body">
      <div class="profile-header__top-row">
        <div class="profile-header__title-row">
          <h1>{{ profile.slug }}</h1>
          <span class="profile-header__badge">Local folder</span>
        </div>
        <RouterLink class="profile-header__button" to="/">Open feed</RouterLink>
      </div>
      <div class="profile-header__stats">
        <span><strong>{{ profile.imageCount }}</strong> posts</span>
        <span><strong>@{{ profile.slug }}</strong> handle</span>
      </div>
      <div class="profile-header__bio">
        <strong>{{ profile.name }}</strong>
        <p>{{ profile.folderPath }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

import type { ProfileSummary } from '../types/api';
import Avatar from './Avatar.vue';

defineProps<{
  profile: ProfileSummary;
}>();
</script>
