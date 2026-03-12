<template>
  <aside
    class="sidebar flex flex-col h-full w-[4.85rem] hover:w-60 overflow-hidden px-[0.95rem] py-5 bg-[#0a0d12] border-r border-white/8 text-[#f8fafc] transition-[width] duration-220 ease"
  >
    <RouterLink
      class="sidebar__brand inline-flex items-center justify-center w-12 h-12 p-[0.3rem] rounded-[1rem] color-inherit transition-[background-color,transform,opacity] duration-180 hover:bg-surface-hover hover:-translate-y-px"
      to="/"
      aria-label="Foldergram home"
    >
      <BrandMark />
    </RouterLink>

    <!-- Nav links + scrollable folders list -->
    <nav
      class="sidebar__nav flex flex-col flex-1 min-h-0 gap-[0.4rem] overflow-y-auto mt-5 [scrollbar-width:none]"
    >
      <RouterLink class="sidebar__link sidebar-item" to="/">
        <span
          class="sidebar__icon flex-shrink-0 w-[1.45rem] h-[1.45rem]"
          aria-hidden="true"
        >
          <svg class="w-full h-full" viewBox="0 0 24 24" role="presentation">
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
        <span class="sidebar__label text-[0.9rem]">Home</span>
      </RouterLink>

      <RouterLink class="sidebar__link sidebar-item" :to="{ name: 'library' }">
        <span
          class="sidebar__icon flex-shrink-0 w-[1.45rem] h-[1.45rem]"
          aria-hidden="true"
        >
          <svg class="w-full h-full" viewBox="0 0 24 24" role="presentation">
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
        <span class="sidebar__label text-[0.9rem]">Library</span>
      </RouterLink>

      <RouterLink class="sidebar__link sidebar-item" :to="{ name: 'likes' }">
        <span
          class="sidebar__icon flex-shrink-0 w-[1.45rem] h-[1.45rem]"
          aria-hidden="true"
        >
          <svg class="w-full h-full" viewBox="0 0 24 24" role="presentation">
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
        <span class="sidebar__label text-[0.9rem]">Likes</span>
        <small
          class="sidebar__badge sidebar__meta ml-auto min-w-[1.5rem] px-[0.45rem] py-[0.1rem] rounded-full text-white/86 bg-white/12 text-[0.72rem] font-bold text-center"
          >{{ likesStore.items.length }}</small
        >
      </RouterLink>

      <RouterLink class="sidebar__link sidebar-item" :to="{ name: 'settings' }">
        <span
          class="sidebar__icon flex-shrink-0 w-[1.45rem] h-[1.45rem]"
          aria-hidden="true"
        >
          <svg class="w-full h-full" viewBox="0 0 32 32" role="presentation">
            <path d="M27 16.76V16v-.77l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4a2 2 0 0 0-1.73-1a2 2 0 0 0-.64.1l-2.43.82a11.35 11.35 0 0 0-1.31-.75l-.51-2.52a2 2 0 0 0-2-1.61h-4.68a2 2 0 0 0-2 1.61l-.51 2.52a11.48 11.48 0 0 0-1.32.75l-2.38-.86A2 2 0 0 0 6.79 6a2 2 0 0 0-1.73 1L2.7 11a2 2 0 0 0 .41 2.51L5 15.24v1.53l-1.89 1.68A2 2 0 0 0 2.7 21l2.36 4a2 2 0 0 0 1.73 1a2 2 0 0 0 .64-.1l2.43-.82a11.35 11.35 0 0 0 1.31.75l.51 2.52a2 2 0 0 0 2 1.61h4.72a2 2 0 0 0 2-1.61l.51-2.52a11.48 11.48 0 0 0 1.32-.75l2.42.82a2 2 0 0 0 .64.1a2 2 0 0 0 1.73-1l2.28-4a2 2 0 0 0-.41-2.51zM25.21 24l-3.43-1.16a8.86 8.86 0 0 1-2.71 1.57L18.36 28h-4.72l-.71-3.55a9.36 9.36 0 0 1-2.7-1.57L6.79 24l-2.36-4l2.72-2.4a8.9 8.9 0 0 1 0-3.13L4.43 12l2.36-4l3.43 1.16a8.86 8.86 0 0 1 2.71-1.57L13.64 4h4.72l.71 3.55a9.36 9.36 0 0 1 2.7 1.57L25.21 8l2.36 4l-2.72 2.4a8.9 8.9 0 0 1 0 3.13L27.57 20z" fill="currentColor" />
            <path d="M16 22a6 6 0 1 1 6-6a5.94 5.94 0 0 1-6 6zm0-10a3.91 3.91 0 0 0-4 4a3.91 3.91 0 0 0 4 4a3.91 3.91 0 0 0 4-4a3.91 3.91 0 0 0-4-4z" fill="currentColor" />
          </svg>
        </span>
        <span class="sidebar__label text-[0.9rem]">Settings</span>
      </RouterLink>

      <!-- Folders/Folders list — scrolls within sidebar -->
      <span
        class="sidebar__section-label sidebar__meta mb-[0.35rem] px-[0.75rem] text-white/45 text-[0.68rem] font-semibold tracking-[0.12em] uppercase"
        >Folders</span
      >
      <RouterLink
        v-for="folder in featuredFolders"
        :key="folder.id"
        class="sidebar__folder sidebar-item"
        :to="{ name: 'folder', params: { slug: folder.slug } }"
      >
        <Avatar
          :name="folder.name"
          :src="folder.avatarUrl"
          class="w-[1.75rem] h-[1.75rem]"
        />
        <span
          class="sidebar__folder-copy sidebar__meta flex flex-col min-w-0 gap-[0.05rem]"
        >
          <strong class="text-[0.82rem]">{{ folder.slug }}</strong>
          <small class="text-white/55 text-[0.68rem]"
            >{{ folder.imageCount }} posts</small
          >
        </span>
      </RouterLink>
    </nav>

    <!-- Theme toggle — pinned to sidebar bottom with separator -->
    <div class="mt-auto border-t border-white/12 pt-3">
      <button
        class="sidebar-item w-full"
        type="button"
        @click="appStore.toggleTheme()"
      >
        <span
          class="sidebar__icon flex-shrink-0 w-[1.45rem] h-[1.45rem]"
          aria-hidden="true"
        >
          <svg
            v-if="appStore.theme === 'light'"
            class="w-full h-full"
            viewBox="0 0 24 24"
            role="presentation"
          >
            <path
              d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m14.86 6.36-1.77-1.77M7.91 7.91 6.14 6.14m11.72 0-1.77 1.77M7.91 16.09l-1.77 1.77M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <svg
            v-else
            class="w-full h-full"
            viewBox="0 0 24 24"
            role="presentation"
          >
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
        <span class="sidebar__label text-[0.9rem]">Theme</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed } from "vue"
  import { RouterLink } from "vue-router"

  import { useAppStore } from "../stores/app"
  import { useLikesStore } from "../stores/likes"
  import { useFoldersStore } from "../stores/folders"
  import Avatar from "./Avatar.vue"
  import BrandMark from "./BrandMark.vue"

  const appStore = useAppStore()
  const likesStore = useLikesStore()
  const foldersStore = useFoldersStore()

  const featuredFolders = computed(() => foldersStore.items.slice(0, 10))
</script>
