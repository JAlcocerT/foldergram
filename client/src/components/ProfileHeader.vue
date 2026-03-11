<template>
  <section class="grid grid-cols-[12rem_minmax(0,1fr)] gap-x-[2.75rem] items-center py-4 pb-10 max-sm:grid-cols-1 max-sm:gap-y-[1.4rem] max-sm:pb-7 max-sm:text-center">
    <!-- Avatar column -->
    <div class="grid place-items-center">
      <Avatar class="w-[9.25rem] h-[9.25rem] border border-border" :name="profile.name" :src="profile.avatarUrl" />
    </div>
    <!-- Info column -->
    <div class="flex flex-col gap-[1.1rem]">
      <div class="flex items-center justify-between gap-4 flex-wrap max-sm:justify-center">
        <div class="flex items-center gap-[0.8rem] flex-wrap">
          <h1 class="m-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">{{ profile.slug }}</h1>
          <span class="px-[0.65rem] py-[0.35rem] rounded-[0.55rem] bg-surface-hover text-muted text-[0.8rem] font-semibold">Local folder</span>
        </div>
      </div>
      <div class="flex items-center gap-8 flex-wrap font-base max-sm:justify-center">
        <span><strong class="mr-[0.35rem]">{{ profile.imageCount }}</strong>posts</span>
        <span><strong class="mr-[0.35rem]">@{{ profile.slug }}</strong>handle</span>
      </div>
      <div class="grid gap-[0.2rem] max-w-[32rem] max-sm:max-w-none">
        <strong class="text-[0.82rem]">{{ profile.name }}</strong>
        <p class="m-0 text-muted">{{ profile.folderPath }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ProfileSummary } from '../types/api';
import Avatar from './Avatar.vue';

defineProps<{
  profile: ProfileSummary;
}>();
</script>
