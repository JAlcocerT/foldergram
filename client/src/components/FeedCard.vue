<template>
  <article class="card overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 px-4 min-h-[3.65rem]">
      <RouterLink class="feed-card__folder flex items-center gap-[0.85rem] min-w-0" :to="{ name: 'folder', params: { slug: item.folderSlug } }">
        <Avatar :name="item.folderName" :src="avatarUrl" />
        <div class="min-w-0">
          <h3 class="m-0 text-[0.9rem] font-semibold truncate">{{ item.folderName }}</h3>
          <p class="m-0 text-muted text-[0.85rem] truncate">{{ item.folderBreadcrumb ?? 'Top-level source folder' }}</p>
        </div>
      </RouterLink>
      <button class="inline-flex items-center justify-center w-8 h-8 p-0 border-0 text-muted bg-transparent cursor-pointer" type="button" aria-label="More options" @click="menuOpen = true">
        <svg class="w-[1.15rem] h-[1.15rem]" viewBox="0 0 24 24" role="presentation">
          <circle cx="12" cy="6.5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="17.5" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>

    <!-- Media -->
    <RouterLink custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
      <a :href="href" class="feed-media block aspect-square bg-surface-alt overflow-hidden" @click="handleImageNavigation($event, navigate)">
        <ResilientImage :src="item.thumbnailUrl" :alt="item.filename" loading="lazy" :retry-while="appStore.isScanning" />
      </a>
    </RouterLink>

    <!-- Body -->
    <div class="grid gap-[0.6rem] px-4 pt-[0.7rem] pb-[0.75rem]">
      <!-- Actions row -->
      <div class="flex items-center justify-between gap-[0.65rem]">
        <div class="flex items-center gap-[0.65rem]">
          <!-- Like button -->
          <button
            class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px disabled:opacity-50 disabled:cursor-wait disabled:transform-none"
            :class="{ 'text-[#e5484d]': likesStore.isLiked(item.id) }"
            type="button"
            :aria-label="likesStore.isLiked(item.id) ? 'Unlike post' : 'Like post'"
            :aria-pressed="likesStore.isLiked(item.id)"
            :disabled="likesStore.isPending(item.id)"
            @click="handleLike"
          >
            <svg class="w-[1.45rem] h-[1.45rem]" viewBox="0 0 24 24" role="presentation">
              <path
                d="m12 20.25-.7-.64C6.35 15.09 4 12.96 4 9.96A4.21 4.21 0 0 1 8.28 5.5c1.44 0 2.83.67 3.72 1.73.89-1.06 2.28-1.73 3.72-1.73A4.21 4.21 0 0 1 20 9.96c0 3-2.35 5.13-7.3 9.65Z"
                :fill="likesStore.isLiked(item.id) ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
              />
            </svg>
          </button>
          <!-- Open image button -->
          <RouterLink custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
            <a :href="href" class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer color-inherit transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px" aria-label="Open image" @click="handleImageNavigation($event, navigate)">
              <svg class="w-[1.45rem] h-[1.45rem]" viewBox="0 0 24 24" role="presentation">
                <path
                  d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5zm2.5 8 2.5-3 2.5 2.5 2-2 2.5 3"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
                <circle cx="15.25" cy="8.75" r="1.25" fill="currentColor" />
              </svg>
            </a>
          </RouterLink>
          <!-- Folder button -->
          <RouterLink class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer color-inherit transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px" :to="{ name: 'folder', params: { slug: item.folderSlug } }" aria-label="Open folder">
            <svg class="w-[1.45rem] h-[1.45rem]" viewBox="0 0 24 24" role="presentation">
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
        </div>
        <!-- Open preview -->
        <a
          class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer color-inherit transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px"
          :href="item.previewUrl"
          target="_blank"
          rel="noreferrer"
          aria-label="Open preview"
        >
          <svg class="w-[1.45rem] h-[1.45rem]" viewBox="0 0 24 24" role="presentation">
            <path
              d="M14 5h5v5m0-5-7.5 7.5M10 7H7.5A2.5 2.5 0 0 0 5 9.5v7A2.5 2.5 0 0 0 7.5 19h7a2.5 2.5 0 0 0 2.5-2.5V14"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </a>
      </div>

      <!-- Caption -->
      <p class="m-0 text-[0.88rem]">
        <strong class="mr-[0.35rem]">{{ item.folderName }}</strong>
        {{ caption }}
      </p>
      <!-- Date -->
      <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.05em]">{{ formattedDate }}</p>
    </div>

    <!-- Context menu backdrop -->
    <div v-if="menuOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/48" @click.self="menuOpen = false">
      <div class="w-[min(100%,22rem)] overflow-hidden bg-surface border border-border rounded-[1rem] shadow-[var(--shadow)]">
        <button class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 border-b border-border text-text bg-transparent cursor-pointer text-left" type="button" @click="openOriginal">
          <svg class="w-[1.15rem] h-[1.15rem] shrink-0" viewBox="0 0 24 24" role="presentation">
            <path
              d="M14 5h5v5m0-5-7.5 7.5M10 7H7.5A2.5 2.5 0 0 0 5 9.5v7A2.5 2.5 0 0 0 7.5 19h7a2.5 2.5 0 0 0 2.5-2.5V14"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>Open original</span>
        </button>
        <button class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 border-b border-border text-[#d93025] bg-transparent cursor-pointer text-left disabled:opacity-70 disabled:cursor-wait" type="button" :disabled="deleting" @click="handleDelete">
          <svg class="w-[1.15rem] h-[1.15rem] shrink-0" viewBox="0 0 24 24" role="presentation">
            <path
              d="M9 4.75h6m-8 3h10m-8.5 0v10a1.25 1.25 0 0 0 1.25 1.25h4.5A1.25 1.25 0 0 0 15.5 17.75v-10m-4 3v5m4-5v5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>{{ deleting ? 'Deleting...' : 'Delete image' }}</span>
        </button>
        <button class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 text-text bg-transparent cursor-pointer text-left" type="button" @click="menuOpen = false">
          <svg class="w-[1.15rem] h-[1.15rem] shrink-0" viewBox="0 0 24 24" role="presentation">
            <path
              d="m7 7 10 10M17 7 7 17"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>Cancel</span>
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-if="confirmDeleteOpen"
      title="Delete this image?"
      message="This image will be permanently deleted from the hard drive. This action cannot be undone."
      :loading="deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="confirmDelete"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { deleteImage } from '../api/gallery';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';

import ConfirmDialog from './ConfirmDialog.vue';
import ResilientImage from './ResilientImage.vue';
import { useAppStore } from '../stores/app';
import { useFeedStore } from '../stores/feed';
import { useLikesStore } from '../stores/likes';
import { useFoldersStore } from '../stores/folders';
import { useMomentsStore } from '../stores/moments';
import type { FeedItem } from '../types/api';
import Avatar from './Avatar.vue';

const props = defineProps<{
  item: FeedItem;
  avatarUrl: string | null;
}>();

const appStore = useAppStore();
const feedStore = useFeedStore();
const likesStore = useLikesStore();
const foldersStore = useFoldersStore();
const momentsStore = useMomentsStore();
const route = useRoute();
const menuOpen = ref(false);
const deleting = ref(false);
const confirmDeleteOpen = ref(false);

const caption = computed(() =>
  props.item.filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const formattedDate = computed(() =>
  new Date(props.item.takenAt ?? props.item.sortTimestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
);

function handleImageNavigation(event: MouseEvent, navigate: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  appStore.setImageModalBackground(route.fullPath);
  navigate();
}

function openOriginal() {
  menuOpen.value = false;
  window.open(`/api/originals/${props.item.id}`, '_blank', 'noopener,noreferrer');
}

function handleDelete() {
  menuOpen.value = false;
  confirmDeleteOpen.value = true;
}

async function handleLike() {
  await likesStore.toggleLike(props.item);
}

async function confirmDelete() {
  deleting.value = true;

  try {
    const deleted = await deleteImage(props.item.id);
    feedStore.removeImage(deleted.id);
    likesStore.removeImage(deleted.id);
    const removedFolder = foldersStore.removeImage(deleted.id, deleted.folderSlug);
    momentsStore.removeImage(deleted.id);
    appStore.removeIndexedImage(removedFolder ? 1 : 0);
    confirmDeleteOpen.value = false;
  } finally {
    deleting.value = false;
  }
}
</script>
