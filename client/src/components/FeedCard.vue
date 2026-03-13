<template>
  <article class="bg-transparent">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 px-4 py-[0.55rem]">
      <RouterLink
        class="feed-card__folder flex items-center gap-[0.72rem] min-w-0"
        :to="{ name: 'folder', params: { slug: item.folderSlug } }"
      >
        <Avatar class="w-8 h-8" :name="item.folderName" :src="avatarUrl" />
        <div class="min-w-0">
          <h3 class="m-0 text-[0.88rem] font-semibold truncate">
            {{ item.folderName }}
          </h3>
        </div>
      </RouterLink>
      <button
        class="inline-flex items-center justify-center w-8 h-8 p-0 border-0 text-muted bg-transparent cursor-pointer"
        type="button"
        aria-label="More options"
        @click="menuOpen = true"
      >
        <svg
          class="w-[1.15rem] h-[1.15rem]"
          viewBox="0 0 24 24"
          role="presentation"
        >
          <circle cx="6.5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="17.5" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>

    <!-- Media -->
    <RouterLink custom :to="`/image/${item.id}`" v-slot="{ href, navigate }">
      <a
        :href="href"
        class="feed-media relative block bg-surface-alt overflow-hidden border border-border rounded-[0.5rem]"
        :style="{ aspectRatio: mediaAspectRatio }"
        @click="handleImageNavigation($event, navigate)"
      >
        <ResilientImage
          :src="item.thumbnailUrl"
          :alt="item.filename"
          loading="lazy"
          :retry-while="appStore.isScanning"
        />
        <div
          v-if="item.mediaType === 'video'"
          class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3 text-white pointer-events-none bg-[linear-gradient(180deg,rgba(10,14,24,0)_0%,rgba(10,14,24,0.82)_100%)]"
        >
          <span class="inline-flex items-center gap-[0.4rem] text-[0.74rem] font-semibold tracking-[0.08em] uppercase">
            <span class="i-fluent-video-16-filled w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
            Reel
          </span>
          <span
            v-if="item.durationMs"
            class="rounded-full bg-black/55 px-[0.55rem] py-[0.18rem] text-[0.76rem] font-semibold"
          >
            {{ formattedDuration }}
          </span>
        </div>
      </a>
    </RouterLink>

    <!-- Body -->
    <div class="grid gap-[0.6rem] px-4 pt-[0.7rem] pb-[0.15rem]">
      <!-- Actions row -->
      <div class="flex items-center justify-between gap-[0.65rem]">
        <div class="flex items-center gap-[0.65rem]">
          <!-- Like button -->
          <button
            class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px disabled:opacity-50 disabled:cursor-wait disabled:transform-none"
            :class="{ 'text-[#e5484d]': likesStore.isLiked(item.id) }"
            type="button"
            :aria-label="
              likesStore.isLiked(item.id) ? 'Unlike post' : 'Like post'
            "
            :aria-pressed="likesStore.isLiked(item.id)"
            :disabled="likesStore.isPending(item.id)"
            @click="handleLike"
          >
            <span
              class="w-[1.45rem] h-[1.45rem]"
              :class="
                likesStore.isLiked(item.id)
                  ? 'i-fluent-heart-16-filled'
                  : 'i-fluent-heart-16-regular'
              "
              aria-hidden="true"
            />
          </button>
          <!-- Open post button -->
          <RouterLink
            custom
            :to="`/image/${item.id}`"
            v-slot="{ href, navigate }"
          >
            <a
              :href="href"
              class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer color-inherit transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px"
              :aria-label="item.mediaType === 'video' ? 'Open reel' : 'Open post'"
              @click="handleImageNavigation($event, navigate)"
            >
              <svg
                class="w-[1.45rem] h-[1.45rem]"
                viewBox="0 0 24 24"
                role="presentation"
              >
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
          <RouterLink
            class="inline-flex items-center justify-center w-8 h-8 border-0 bg-transparent cursor-pointer color-inherit transition-[opacity,transform] duration-180 hover:opacity-72 hover:-translate-y-px"
            :to="{ name: 'folder', params: { slug: item.folderSlug } }"
            aria-label="Open folder"
          >
            <span
              class="i-fluent-folder-16-regular w-[1.30rem] h-[1.30rem]"
              aria-hidden="true"
            />
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
          <svg
            class="w-[1.45rem] h-[1.45rem]"
            viewBox="0 0 24 24"
            role="presentation"
          >
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
      <p class="m-0 text-muted text-[0.72rem] uppercase tracking-[0.05em]">
        {{ formattedDate }}
      </p>
    </div>

    <!-- Context menu backdrop -->
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/48"
      @click.self="menuOpen = false"
    >
      <div
        class="w-[min(100%,22rem)] overflow-hidden bg-surface border border-border rounded-[1rem] shadow-[var(--shadow)]"
      >
        <button
          class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 border-b border-border text-text bg-transparent cursor-pointer text-left"
          type="button"
          @click="openOriginal"
        >
          <svg
            class="w-[1.15rem] h-[1.15rem] shrink-0"
            viewBox="0 0 24 24"
            role="presentation"
          >
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
        <button
          class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 border-b border-border text-[#d93025] bg-transparent cursor-pointer text-left disabled:opacity-70 disabled:cursor-wait"
          type="button"
          :disabled="deleting"
          @click="handleDelete"
        >
          <svg
            class="w-[1.15rem] h-[1.15rem] shrink-0"
            viewBox="0 0 24 24"
            role="presentation"
          >
            <path
              d="M9 4.75h6m-8 3h10m-8.5 0v10a1.25 1.25 0 0 0 1.25 1.25h4.5A1.25 1.25 0 0 0 15.5 17.75v-10m-4 3v5m4-5v5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span>{{ deleting ? "Deleting..." : "Delete post" }}</span>
        </button>
        <button
          class="flex items-center gap-[0.8rem] w-full px-4 py-[0.95rem] border-0 text-text bg-transparent cursor-pointer text-left"
          type="button"
          @click="menuOpen = false"
        >
          <svg
            class="w-[1.15rem] h-[1.15rem] shrink-0"
            viewBox="0 0 24 24"
            role="presentation"
          >
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
      title="Delete this post?"
      message="This file will be permanently deleted from the hard drive. This action cannot be undone."
      :loading="deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="confirmDelete"
    />
  </article>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue"
  import { deleteImage } from "../api/gallery"
  import { useRoute } from "vue-router"
  import { RouterLink } from "vue-router"

  import ConfirmDialog from "./ConfirmDialog.vue"
  import ResilientImage from "./ResilientImage.vue"
  import { useAppStore } from "../stores/app"
  import { useFeedStore } from "../stores/feed"
  import { useLikesStore } from "../stores/likes"
  import { useFoldersStore } from "../stores/folders"
  import { useMomentsStore } from "../stores/moments"
  import type { FeedItem } from "../types/api"
  import { resolveFeedAspectRatio } from "../utils/media-layout"
  import { formatMediaDuration } from "../utils/media"
  import Avatar from "./Avatar.vue"

  const props = defineProps<{
    item: FeedItem
    avatarUrl: string | null
  }>()

  const appStore = useAppStore()
  const feedStore = useFeedStore()
  const likesStore = useLikesStore()
  const foldersStore = useFoldersStore()
  const momentsStore = useMomentsStore()
  const route = useRoute()
  const menuOpen = ref(false)
  const deleting = ref(false)
  const confirmDeleteOpen = ref(false)

  const caption = computed(() =>
    props.item.filename
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )

  const formattedDate = computed(() =>
    new Date(props.item.takenAt ?? props.item.sortTimestamp).toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    ),
  )

  const formattedDuration = computed(() =>
    formatMediaDuration(props.item.durationMs),
  )

  const mediaAspectRatio = computed(() =>
    resolveFeedAspectRatio(props.item.width, props.item.height),
  )

  function handleImageNavigation(event: MouseEvent, navigate: () => void) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    appStore.setImageModalBackground(route.fullPath)
    navigate()
  }

  function openOriginal() {
    menuOpen.value = false
    window.open(
      `/api/originals/${props.item.id}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  function handleDelete() {
    menuOpen.value = false
    confirmDeleteOpen.value = true
  }

  async function handleLike() {
    await likesStore.toggleLike(props.item)
  }

  async function confirmDelete() {
    deleting.value = true

    try {
      const deleted = await deleteImage(props.item.id)
      feedStore.removeImage(deleted.id)
      likesStore.removeImage(deleted.id)
      const removedFolder = foldersStore.removeImage(
        deleted.id,
        deleted.folderSlug,
        props.item.mediaType,
      )
      momentsStore.removeImage(deleted.id)
      appStore.removeIndexedImage(removedFolder ? 1 : 0, props.item.mediaType)
      confirmDeleteOpen.value = false
    } finally {
      deleting.value = false
    }
  }
</script>
