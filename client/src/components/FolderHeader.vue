<template>
  <section class="grid grid-cols-[10.75rem_minmax(0,1fr)] items-start gap-x-[2.65rem] pt-[0.6rem] pb-[2.4rem] max-md:grid-cols-[9rem_minmax(0,1fr)] max-md:gap-x-[2rem] max-sm:grid-cols-1 max-sm:gap-y-[1.35rem] max-sm:pb-[1.85rem] max-sm:text-center">
    <div class="grid place-items-center">
      <div class="rounded-full p-[0.22rem] shadow-[0_16px_34px_rgba(246,106,61,0.12)]" style="background: var(--story-ring);">
        <div class="rounded-full bg-bg p-[0.22rem]">
          <Avatar class="w-[9.35rem] h-[9.35rem] max-md:w-[7.75rem] max-md:h-[7.75rem]" :name="folder.name" :src="folder.avatarUrl" />
        </div>
      </div>
    </div>
    <div class="grid gap-[1rem] pt-[0.35rem]">
      <div class="flex items-center gap-[0.75rem] flex-wrap max-sm:justify-center">
        <h1 class="m-0 text-[clamp(1.6rem,2.4vw,2rem)] font-medium leading-none tracking-[-0.04em]">{{ folder.name }}</h1>
        <span class="inline-flex items-center rounded-full bg-surface-hover px-[0.72rem] py-[0.34rem] text-[0.78rem] font-semibold text-muted">App folder</span>
      </div>
      <p v-if="folder.breadcrumb" class="m-0 text-[0.84rem] font-medium tracking-[0.02em] text-muted">{{ folder.breadcrumb }}</p>
      <div class="flex items-center gap-[1.6rem] flex-wrap text-[0.95rem] leading-none max-sm:justify-center">
        <span><strong class="mr-[0.35rem] font-semibold">{{ folder.imageCount }}</strong>posts</span>
        <span><strong class="mr-[0.35rem] font-semibold">{{ folder.videoCount }}</strong>reels</span>
        <span v-if="folder.latestImageMtimeMs"><strong class="mr-[0.35rem] font-semibold">{{ formattedUpdatedDate }}</strong>updated</span>
      </div>
      <div class="grid max-w-[29rem] gap-[0.28rem] max-sm:max-w-none">
        <span class="text-[0.74rem] font-bold tracking-[0.1em] text-muted uppercase">Library path</span>
        <p class="m-0 font-mono text-[0.8rem] leading-[1.5] text-muted break-all">{{ folder.folderPath }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FolderSummary } from '../types/api';
import Avatar from './Avatar.vue';

const props = defineProps<{
  folder: FolderSummary;
}>();

const formattedUpdatedDate = computed(() =>
  props.folder.latestImageMtimeMs
    ? new Date(props.folder.latestImageMtimeMs).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : ''
);
</script>
