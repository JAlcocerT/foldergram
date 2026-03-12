<template>
  <section v-if="image" :class="['viewer relative', { 'viewer--modal': isModal }]" @wheel="handleWheel">
    <!-- Close button (modal only) -->
    <button v-if="isModal" class="fixed top-[5px] right-[5px] z-55 inline-flex items-center justify-center w-[2.35rem] h-[2.35rem] p-0 border-0 text-white bg-transparent cursor-pointer" type="button" aria-label="Close image" @click="$emit('close')">
      <svg class="w-[1.2rem] h-[1.2rem]" viewBox="0 0 24 24" role="presentation">
        <path
          d="m7 7 10 10M17 7 7 17"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </button>

    <!-- Previous nav -->
    <RouterLink
      v-if="image.previousImageId"
      :class="[
        'inline-flex items-center justify-center w-[2.2rem] h-[2.2rem] rounded-full text-[#111] bg-white/88 shadow-[0_8px_20px_rgba(0,0,0,0.18)]',
        isModal ? 'fixed top-1/2 z-45 -translate-y-1/2 left-[5px]' : 'absolute top-1/2 z-2 -mt-[1.1rem] left-[-3.25rem] max-md:left-[-2.75rem]'
      ]"
      :to="`/image/${image.previousImageId}`"
      aria-label="Previous image"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" role="presentation">
        <path
          d="m14.5 6.5-5 5 5 5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </RouterLink>

    <!-- Next nav -->
    <RouterLink
      v-if="image.nextImageId"
      :class="[
        'inline-flex items-center justify-center w-[2.2rem] h-[2.2rem] rounded-full text-[#111] bg-white/88 shadow-[0_8px_20px_rgba(0,0,0,0.18)]',
        isModal ? 'fixed top-1/2 z-45 -translate-y-1/2 right-[5px]' : 'absolute top-1/2 z-2 -mt-[1.1rem] right-[-3.25rem] max-md:right-[-2.75rem]'
      ]"
      :to="`/image/${image.nextImageId}`"
      aria-label="Next image"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" role="presentation">
        <path
          d="m9.5 6.5 5 5-5 5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </RouterLink>

    <!-- Card -->
    <div class="card grid grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.9fr)] overflow-hidden max-md:grid-cols-1 viewer__card-wrapper" :class="isModal ? 'max-h-[calc(100vh-2rem)]' : ''">
      <!-- Media -->
      <div
        class="viewer-media relative bg-surface-alt"
        :class="isModal ? 'h-[calc(100vh-2rem)] min-h-0' : 'min-h-[34rem] max-md:min-h-[18rem]'"
      >
        <ResilientImage :src="image.previewUrl" :alt="image.filename" loading="eager" :retry-while="appStore.isScanning" class="object-contain" />
      </div>

      <!-- Sidebar -->
      <aside
        class="viewer__sidebar flex flex-col gap-4"
        :class="isModal ? 'max-h-[calc(100vh-2rem)] overflow-y-auto [scrollbar-width:thin]' : ''"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 border-b border-border px-5 pt-[1.1rem] pb-4">
          <RouterLink class="flex items-center gap-[0.85rem] min-w-0" :to="{ name: 'folder', params: { slug: image.folderSlug } }" aria-label="Open folder">
            <Avatar :name="image.folderName" :src="folderAvatar" />
            <div class="min-w-0">
              <h2 class="m-0 text-[0.9rem] font-semibold truncate">{{ image.folderName }}</h2>
              <p class="m-0 text-muted truncate">{{ folder?.breadcrumb ?? image.folderBreadcrumb ?? 'Top-level source folder' }}</p>
            </div>
          </RouterLink>
          <span class="text-muted text-[0.78rem] whitespace-nowrap">{{ formattedDate }}</span>
        </div>

        <!-- Description -->
        <div class="grid gap-[0.3rem] px-5 pt-[1.1rem]">
          <p class="m-0 text-text">
            <strong class="mr-[0.35rem]">{{ image.folderName }}</strong>
            {{ readableFilename }}
          </p>
          <p class="m-0 text-muted">{{ image.relativePath }}</p>
        </div>

        <!-- Meta -->
        <dl class="grid gap-[0.9rem] m-0 px-5 pt-[0.35rem]">
          <div>
            <dt class="text-muted text-[0.75rem] mb-[0.25rem] uppercase tracking-[0.05em]">Dimensions</dt>
            <dd class="m-0 text-[0.96rem] font-semibold">{{ image.width }} × {{ image.height }}</dd>
          </div>
          <div>
            <dt class="text-muted text-[0.75rem] mb-[0.25rem] uppercase tracking-[0.05em]">Type</dt>
            <dd class="m-0 text-[0.96rem] font-semibold">{{ image.mimeType }}</dd>
          </div>
          <div>
            <dt class="text-muted text-[0.75rem] mb-[0.25rem] uppercase tracking-[0.05em]">Size</dt>
            <dd class="m-0 text-[0.96rem] font-semibold">{{ fileSize }}</dd>
          </div>
        </dl>

        <!-- Actions -->
        <div class="flex items-center justify-between gap-4 px-5 pt-[0.7rem] pb-5 mt-auto">
          <!-- Like -->
          <button
            class="inline-flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer transition-[opacity,transform,color] duration-180 hover:opacity-72 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait disabled:transform-none"
            :class="{ 'text-[#e5484d]': likesStore.isLiked(image.id) }"
            type="button"
            :aria-label="likesStore.isLiked(image.id) ? 'Unlike post' : 'Like post'"
            :aria-pressed="likesStore.isLiked(image.id)"
            :disabled="likesStore.isPending(image.id)"
            @click="likesStore.toggleLike(image)"
          >
            <svg class="w-[1.55rem] h-[1.55rem]" viewBox="0 0 48 48" role="presentation">
              <path
                d="M7.923 10.155a10.42 10.42 0 0 1 13.806.684l2.272 2.223l2.266-2.22a10.42 10.42 0 0 1 13.809-.687c4.85 3.887 5.242 11.13.837 15.516l-16.03 15.964a1.25 1.25 0 0 1-1.764 0L7.087 25.67c-4.405-4.386-4.015-11.628.836-15.516zm12.057 2.47a7.92 7.92 0 0 0-10.494-.52C5.8 15.06 5.503 20.565 8.851 23.9L24 38.986l15.148-15.087c3.348-3.334 3.05-8.839-.636-11.793a7.921 7.921 0 0 0-10.496.522l-3.141 3.077a1.25 1.25 0 0 1-1.75 0l-3.146-3.08z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div class="flex items-center gap-4">
            <!-- Open original -->
            <a
              class="inline-flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer text-text transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px"
              :href="image.originalUrl"
              target="_blank"
              rel="noreferrer"
              aria-label="Open original image"
            >
              <svg class="w-[1.55rem] h-[1.55rem]" viewBox="0 0 24 24" role="presentation">
                <path d="M11 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" />
                <path d="M10 14L20 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" />
                <path d="M15 4h5v5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" />
              </svg>
            </a>
            <!-- Delete -->
            <button
              class="inline-flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer text-[#d93025] transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait disabled:transform-none"
              type="button"
              aria-label="Delete image"
              :disabled="deleting"
              @click="$emit('delete')"
            >
              <svg class="w-[1.38rem] h-[1.38rem]" viewBox="0 0 32 32" role="presentation">
                <path d="M12 12h2v12h-2z" fill="currentColor" />
                <path d="M18 12h2v12h-2z" fill="currentColor" />
                <path d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20z" fill="currentColor" />
                <path d="M12 2h8v2h-8z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import type { ImageDetail, FolderSummary } from '../types/api';
import { useAppStore } from '../stores/app';
import { useLikesStore } from '../stores/likes';
import Avatar from './Avatar.vue';
import ResilientImage from './ResilientImage.vue';

const props = defineProps<{
  image: ImageDetail | null;
  folder?: FolderSummary | null;
  isModal?: boolean;
  deleting?: boolean;
}>();

defineEmits<{
  close: [];
  delete: [];
}>();

const likesStore = useLikesStore();
const appStore = useAppStore();
const router = useRouter();
const wheelDeltaAccumulator = ref(0);
const navigationLockedUntil = ref(0);

const WHEEL_NAVIGATION_THRESHOLD = 72;
const NAVIGATION_COOLDOWN_MS = 320;

const fileSize = computed(() => {
  if (!props.image) {
    return '';
  }

  const megabytes = props.image.fileSize / (1024 * 1024);
  return `${megabytes.toFixed(2)} MB`;
});

const folderAvatar = computed(() => props.folder?.avatarUrl ?? null);
const readableFilename = computed(() =>
  props.image
    ? props.image.filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
);
const formattedDate = computed(() =>
  props.image
    ? new Date(props.image.sortTimestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : ''
);

watch(
  () => props.image?.id ?? null,
  () => {
    wheelDeltaAccumulator.value = 0;
    navigationLockedUntil.value = 0;
  }
);

async function navigateByDirection(direction: 'previous' | 'next') {
  if (!props.image) {
    return;
  }

  const targetId = direction === 'next' ? props.image.nextImageId : props.image.previousImageId;
  if (!targetId) {
    return;
  }

  navigationLockedUntil.value = Date.now() + NAVIGATION_COOLDOWN_MS;
  await router.push({ name: 'image', params: { id: String(targetId) } });
}

function handleWheel(event: WheelEvent) {
  if (!props.isModal || !props.image) {
    return;
  }

  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
    return;
  }

  event.preventDefault();

  if (Date.now() < navigationLockedUntil.value) {
    return;
  }

  wheelDeltaAccumulator.value += event.deltaY;

  if (Math.abs(wheelDeltaAccumulator.value) < WHEEL_NAVIGATION_THRESHOLD) {
    return;
  }

  const direction = wheelDeltaAccumulator.value > 0 ? 'next' : 'previous';
  wheelDeltaAccumulator.value = 0;
  void navigateByDirection(direction);
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.isModal || !props.image || event.defaultPrevented) {
    return;
  }

  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }

  if (Date.now() < navigationLockedUntil.value) {
    return;
  }

  let direction: 'previous' | 'next' | null = null;

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    direction = 'previous';
  }

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    direction = 'next';
  }

  if (!direction) {
    return;
  }

  event.preventDefault();
  wheelDeltaAccumulator.value = 0;
  void navigateByDirection(direction);
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>
