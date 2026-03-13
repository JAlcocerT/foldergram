<template>
  <div class="rail-viewer fixed inset-0 z-[80] bg-black" @click.self="emit('close')">
    <button
      class="absolute right-4 top-4 z-[6] inline-flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent p-0 text-white transition-opacity duration-150 hover:opacity-72"
      type="button"
      aria-label="Close viewer"
      @click="emit('close')"
    >
      <svg class="h-7 w-7" viewBox="0 0 24 24" role="presentation">
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

    <section class="story-overlay">
      <button
        class="story-highlight-arrow story-highlight-arrow--left"
        type="button"
        aria-label="Previous highlight"
        :disabled="!previousCapsule"
        @click="openPreviousHighlight"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" role="presentation">
          <path
            d="m14.5 6.5-5 5 5 5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </button>

      <div class="story-preview-slot story-preview-slot--left">
        <button
          v-if="previousCapsule"
          class="story-preview-button"
          type="button"
          :aria-label="`Open ${previousCapsule.title}`"
          @click="openCapsule(previousCapsule.id)"
        >
          <article class="story-side-card">
            <ResilientImage
              class="story-side-card__image"
              :src="previousCapsule.coverImage.previewUrl"
              :alt="previousCapsule.title"
              loading="lazy"
              :retry-while="appStore.isScanning"
            />
            <div class="story-side-card__shade" />
            <div class="story-side-card__meta">
              <strong class="block truncate text-[0.92rem]">{{ previousCapsule.title }}</strong>
              <span class="block truncate text-[0.78rem] text-white/68">{{ previousCapsule.imageCount }} photos</span>
            </div>
          </article>
        </button>
      </div>

      <article class="story-stage">
        <div class="story-stage__progress">
          <span
            v-for="(_, index) in progressMarkers"
            :key="index"
            class="story-stage__progress-track"
          >
            <span class="story-stage__progress-fill" :style="{ transform: `scaleX(${segmentProgress(index)})` }" />
          </span>
        </div>

        <header class="story-stage__header">
          <div class="story-stage__header-main">
            <div class="story-stage__ring">
              <div class="story-stage__ring-inner">
                <Avatar
                  class="h-[2.55rem] w-[2.55rem]"
                  :name="activeCapsule?.title ?? railSingularLabel"
                  :src="activeCapsule?.coverImage.thumbnailUrl ?? null"
                />
              </div>
            </div>
            <div class="min-w-0">
              <strong class="block truncate text-[0.95rem]">{{ activeCapsule?.title ?? 'Loading…' }}</strong>
              <p class="m-0 truncate text-[0.78rem] text-white/68">{{ activeCapsuleMeta }}</p>
            </div>
          </div>
          <span class="shrink-0 text-[0.76rem] font-semibold text-white/64">{{ imagePositionLabel }}</span>
        </header>

        <button
          class="story-stage__image-nav story-stage__image-nav--left"
          type="button"
          aria-label="Previous photo"
          @click="showPreviousImage"
        />
        <button
          class="story-stage__image-nav story-stage__image-nav--right"
          type="button"
          aria-label="Next photo"
          @click="showNextImage"
        />

        <div class="story-stage__surface">
          <ResilientImage
            v-if="displayImage"
            class="story-stage__image"
            :src="displayImage.previewUrl"
            :alt="displayImage.filename"
            loading="eager"
            :retry-while="appStore.isScanning"
          />
          <div v-else class="story-stage__empty">
            Loading {{ railSingularLabel.toLowerCase() }}…
          </div>
        </div>

        <footer class="story-stage__footer">
          <div class="grid gap-[0.18rem]">
            <strong class="text-[0.92rem]">{{ displayImage?.folderName ?? activeCapsule?.title }}</strong>
            <p class="m-0 text-[0.8rem] text-white/70">{{ footerMeta }}</p>
          </div>
        </footer>
      </article>

      <div class="story-preview-slot story-preview-slot--right">
        <button
          v-for="capsule in nextCapsules"
          :key="capsule.id"
          class="story-preview-button"
          type="button"
          :aria-label="`Open ${capsule.title}`"
          @click="openCapsule(capsule.id)"
        >
          <article class="story-side-card story-side-card--compact">
            <ResilientImage
              class="story-side-card__image"
              :src="capsule.coverImage.previewUrl"
              :alt="capsule.title"
              loading="lazy"
              :retry-while="appStore.isScanning"
            />
            <div class="story-side-card__shade" />
            <div class="story-side-card__meta">
              <strong class="block truncate text-[0.9rem]">{{ capsule.title }}</strong>
              <span class="block truncate text-[0.76rem] text-white/68">{{ capsule.imageCount }} photos</span>
            </div>
          </article>
        </button>
      </div>

      <button
        class="story-highlight-arrow story-highlight-arrow--right"
        type="button"
        aria-label="Next highlight"
        :disabled="!nextHighlightCapsule"
        @click="openNextHighlight"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" role="presentation">
          <path
            d="m9.5 6.5 5 5-5 5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import type { FeedItem, MomentCapsule } from '../types/api';
import { useAppStore } from '../stores/app';
import { useMomentsStore } from '../stores/moments';
import Avatar from './Avatar.vue';
import ResilientImage from './ResilientImage.vue';

const STORY_AUTO_ADVANCE_MS = 4200;

const props = defineProps<{
  items: MomentCapsule[];
  initialId: string;
  railSingularLabel: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const appStore = useAppStore();
const momentsStore = useMomentsStore();
const activeCapsuleId = ref(props.initialId);
const activeImageIndex = ref(0);
const autoplayProgress = ref(0);
const transitionPending = ref(false);

let previousBodyOverflow = '';
let animationFrameId = 0;
let autoplayStartedAt = 0;

const activeCapsuleIndex = computed(() => props.items.findIndex((item) => item.id === activeCapsuleId.value));
const activeCapsule = computed(() => {
  if (momentsStore.currentMoment?.id === activeCapsuleId.value) {
    return momentsStore.currentMoment;
  }

  return props.items.find((item) => item.id === activeCapsuleId.value) ?? null;
});
const activeImages = computed(() =>
  momentsStore.currentMoment?.id === activeCapsuleId.value ? momentsStore.currentImages : []
);
const displayImage = computed<FeedItem | null>(() => activeImages.value[activeImageIndex.value] ?? activeCapsule.value?.coverImage ?? null);
const previousCapsule = computed(() => {
  const index = activeCapsuleIndex.value;
  return index > 0 ? props.items[index - 1] : null;
});
const nextHighlightCapsule = computed(() => {
  const index = activeCapsuleIndex.value;
  return index >= 0 ? props.items[index + 1] ?? null : null;
});
const nextCapsules = computed(() => {
  const index = activeCapsuleIndex.value;
  return index >= 0 ? props.items.slice(index + 1, index + 3) : [];
});
const progressMarkers = computed(() => Array.from({ length: Math.max(activeImages.value.length, 1) }));
const imagePositionLabel = computed(() => {
  if (activeImages.value.length === 0) {
    return '1 / 1';
  }

  return `${activeImageIndex.value + 1} / ${activeImages.value.length}`;
});
const activeCapsuleMeta = computed(() => {
  if (!activeCapsule.value) {
    return '';
  }

  return `${activeCapsule.value.imageCount} photos · ${activeCapsule.value.dateContext}`;
});
const footerMeta = computed(() => {
  if (!displayImage.value) {
    return '';
  }

  return new Date(displayImage.value.takenAt ?? displayImage.value.sortTimestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
});

watch(
  () => props.initialId,
  async (id) => {
    await openCapsule(id);
  }
);

watch(
  () => [displayImage.value?.id ?? null, activeCapsuleId.value] as const,
  () => {
    restartAutoplay();
  }
);

watch(
  () => activeImages.value.length,
  (length) => {
    if (length === 0) {
      activeImageIndex.value = 0;
      return;
    }

    if (activeImageIndex.value >= length) {
      activeImageIndex.value = length - 1;
    }
  }
);

function segmentProgress(index: number) {
  if (index < activeImageIndex.value) {
    return 1;
  }

  if (index > activeImageIndex.value) {
    return 0;
  }

  return autoplayProgress.value;
}

function stopAutoplay() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
}

function restartAutoplay() {
  stopAutoplay();
  autoplayProgress.value = 0;

  if (!displayImage.value) {
    return;
  }

  autoplayStartedAt = performance.now();

  const tick = async (now: number) => {
    autoplayProgress.value = Math.min(1, (now - autoplayStartedAt) / STORY_AUTO_ADVANCE_MS);

    if (autoplayProgress.value >= 1) {
      stopAutoplay();
      await showNextImageFromAutoplay();
      return;
    }

    animationFrameId = requestAnimationFrame(tick);
  };

  animationFrameId = requestAnimationFrame(tick);
}

async function ensureCapsuleLoaded(id: string, reset = true) {
  transitionPending.value = true;
  stopAutoplay();
  activeCapsuleId.value = id;

  if (reset) {
    activeImageIndex.value = 0;
  }

  try {
    await momentsStore.loadMoment(id, true);
  } finally {
    transitionPending.value = false;
  }
}

async function openCapsule(id: string) {
  if (transitionPending.value) {
    return;
  }

  if (id === activeCapsuleId.value && activeImages.value.length > 0) {
    return;
  }

  await ensureCapsuleLoaded(id, true);
}

async function openPreviousHighlight() {
  if (!previousCapsule.value) {
    return;
  }

  await openCapsule(previousCapsule.value.id);
}

async function openNextHighlight() {
  if (!nextHighlightCapsule.value) {
    return;
  }

  await openCapsule(nextHighlightCapsule.value.id);
}

async function showNextImage() {
  await showNextImageInternal(false);
}

async function showNextImageFromAutoplay() {
  await showNextImageInternal(true);
}

async function showNextImageInternal(fromAutoplay: boolean) {
  if (transitionPending.value) {
    return;
  }

  if (activeImageIndex.value < activeImages.value.length - 1) {
    activeImageIndex.value += 1;
    return;
  }

  if (momentsStore.currentHasMore) {
    transitionPending.value = true;
    stopAutoplay();
    const previousLength = activeImages.value.length;

    try {
      await momentsStore.loadMoment(activeCapsuleId.value, false);
    } finally {
      transitionPending.value = false;
    }

    if (activeImages.value.length > previousLength) {
      activeImageIndex.value = previousLength;
      return;
    }
  }

  if (nextHighlightCapsule.value) {
    await ensureCapsuleLoaded(nextHighlightCapsule.value.id, true);
    return;
  }

  if (fromAutoplay) {
    autoplayProgress.value = 1;
  }
}

async function showPreviousImage() {
  if (transitionPending.value) {
    return;
  }

  if (activeImageIndex.value > 0) {
    activeImageIndex.value -= 1;
    return;
  }

  if (!previousCapsule.value) {
    return;
  }

  await ensureCapsuleLoaded(previousCapsule.value.id, true);
  if (momentsStore.currentImages.length > 0) {
    activeImageIndex.value = momentsStore.currentImages.length - 1;
  }
}

async function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    await openNextHighlight();
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    await openPreviousHighlight();
  }
}

function lockBodyScroll() {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
  document.body.style.overflow = previousBodyOverflow;
}

onMounted(async () => {
  lockBodyScroll();
  window.addEventListener('keydown', handleKeydown);
  await ensureCapsuleLoaded(props.initialId, true);
});

onUnmounted(() => {
  stopAutoplay();
  unlockBodyScroll();
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.rail-viewer {
  background: #000;
  backdrop-filter: none;
}

.story-overlay {
  display: grid;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 1.35rem;
  grid-template-columns: 0 minmax(0, 28rem) minmax(0, 22rem) 0;
}

.story-highlight-arrow {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: white;
  cursor: pointer;
  transition: opacity 150ms ease, transform 150ms ease, background-color 150ms ease;
}

.story-highlight-arrow:hover {
  background: rgba(255, 255, 255, 0.24);
  transform: scale(1.04);
}

.story-highlight-arrow:disabled {
  opacity: 0.22;
  cursor: default;
  transform: none;
}

.story-preview-slot {
  display: none;
  min-height: 0;
}

.story-preview-slot--right {
  justify-content: flex-start;
  gap: 1rem;
}

.story-preview-button {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 180ms ease, opacity 180ms ease;
}

.story-preview-button:hover {
  transform: scale(1.02);
}

.story-side-card {
  position: relative;
  width: 11rem;
  height: 19rem;
  overflow: hidden;
  border-radius: 0.9rem;
  opacity: 0.82;
}

.story-side-card--compact {
  width: 9rem;
  height: 16rem;
}

.story-side-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-side-card__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.72));
}

.story-side-card__meta {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.9rem;
}

.story-stage {
  position: relative;
  width: min(100%, 28rem);
  height: min(100%, 44rem);
  overflow: hidden;
  border-radius: 0.85rem;
  background: #000;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

.story-stage__surface {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.story-stage__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.story-stage__empty {
  color: rgba(255, 255, 255, 0.62);
}

.story-stage__progress {
  position: absolute;
  left: 0.9rem;
  right: 0.9rem;
  top: 0.9rem;
  z-index: 3;
  display: flex;
  gap: 0.35rem;
}

.story-stage__progress-track {
  height: 0.2rem;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.story-stage__progress-fill {
  display: block;
  height: 100%;
  width: 100%;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.98);
  transform-origin: left center;
}

.story-stage__header {
  position: absolute;
  inset: 1.55rem 0.95rem auto 0.95rem;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
}

.story-stage__header-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.story-stage__ring {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 2px;
  background: var(--story-ring);
}

.story-stage__ring-inner {
  border-radius: 999px;
  padding: 2px;
  background: #050608;
}

.story-stage__image-nav {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 32%;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.story-stage__image-nav--left {
  left: 0;
}

.story-stage__image-nav--right {
  right: 0;
}

.story-stage__footer {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 3;
  padding: 5rem 1rem 1rem;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.8) 44%, rgba(0, 0, 0, 0.96));
}

@media (min-width: 1024px) {
  .story-overlay {
    grid-template-columns: 2.75rem 11rem minmax(0, 28rem) minmax(0, 22rem) 2.75rem;
  }

  .story-highlight-arrow,
  .story-preview-slot {
    display: flex;
  }

  .story-preview-slot--left {
    justify-content: flex-end;
  }
}
</style>
