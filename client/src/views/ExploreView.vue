<template>
  <section
    class="explore-view min-h-[calc(100vh-4rem)] bg-[#04070d] text-white"
  >
    <div
      class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[72rem] flex-col gap-6 px-4 py-5 md:px-6 md:py-7"
    >
      <header
        class="flex items-center gap-3"
        :class="isSearchActive ? 'max-w-[35rem]' : 'justify-center'"
      >
        <button
          v-if="isSearchActive"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent p-0 text-white/84 transition-colors duration-150 hover:bg-white/8 hover:text-white"
          type="button"
          aria-label="Back to explore posts"
          @click="closeSearch"
        >
          <svg
            class="h-[1.3rem] w-[1.3rem]"
            viewBox="0 0 24 24"
            role="presentation"
          >
            <path
              d="m15 5-7 7 7 7"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.9"
            />
          </svg>
        </button>

        <label
          class="explore-view__search flex flex-1 items-center gap-3 rounded-full bg-white/5 px-4 py-[0.82rem]"
        >
          <svg
            class="h-[1.15rem] w-[1.15rem] flex-shrink-0 text-white/48"
            viewBox="0 0 24 24"
            role="presentation"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
            <path
              d="m21 21-4.35-4.35"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            class="w-full border-0 bg-transparent p-0 text-[1rem] text-white outline-none placeholder:text-white/54"
            type="search"
            placeholder="Search"
            spellcheck="false"
            @focus="activateSearch"
            @keydown.esc.prevent="handleEscape"
          />
          <button
            v-if="searchQuery.length > 0"
            class="inline-flex h-6 w-6 items-center justify-center rounded-full border-0 bg-white/16 p-0 text-white/70 transition-colors duration-150 hover:bg-white/24 hover:text-white"
            type="button"
            aria-label="Clear search"
            @click="clearSearch"
          >
            <svg
              class="h-[0.85rem] w-[0.85rem]"
              viewBox="0 0 24 24"
              role="presentation"
            >
              <path
                d="m8 8 8 8M16 8l-8 8"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.1"
              />
            </svg>
          </button>
        </label>
      </header>

      <section
        v-if="appStore.isLibraryUnavailable"
        class="explore-view__message-card max-w-[35rem]"
      >
        <h1 class="m-0 text-[1.15rem] font-semibold text-white">
          Library storage unavailable
        </h1>
        <p class="m-0 text-white/60">{{ appStore.libraryUnavailableReason }}</p>
      </section>

      <section v-else-if="isSearchActive" class="max-w-[35rem]">
        <div v-if="trimmedSearchQuery.length === 0" class="grid gap-4 pt-2">
          <div class="flex items-center justify-between gap-3">
            <h1
              class="m-0 text-[1.45rem] font-semibold tracking-[-0.03em] text-white"
            >
              Recent
            </h1>
          </div>

          <p
            v-if="foldersStore.loadingList && foldersStore.items.length === 0"
            class="m-0 text-[0.96rem] text-white/56"
          >
            Loading folders...
          </p>
          <p
            v-else-if="recentSearchFolders.length === 0"
            class="m-0 text-[1rem] text-white/46"
          >
            No recent searches.
          </p>

          <div v-else class="grid gap-1">
            <button
              v-for="folder in recentSearchFolders"
              :key="folder.id"
              class="explore-view__result"
              type="button"
              @click="openFolder(folder)"
            >
              <Avatar
                class="h-12 w-12 flex-shrink-0"
                :name="folder.name"
                :src="folder.avatarUrl"
              />
              <span class="min-w-0 flex-1 text-left">
                <strong
                  class="block truncate text-[0.96rem] font-semibold text-white"
                  >{{ folder.name }}</strong
                >
                <span class="block truncate text-[0.84rem] text-white/54">
                  {{ describeFolder(folder) }}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div v-else class="grid gap-1 pt-2">
          <button
            v-for="folder in searchResults"
            :key="folder.id"
            class="explore-view__result"
            type="button"
            @click="openFolder(folder)"
          >
            <Avatar
              class="h-12 w-12 flex-shrink-0"
              :name="folder.name"
              :src="folder.avatarUrl"
            />
            <span class="min-w-0 flex-1 text-left">
              <strong
                class="block truncate text-[0.96rem] font-semibold text-white"
                >{{ folder.name }}</strong
              >
              <span class="block truncate text-[0.84rem] text-white/54">
                {{ describeFolder(folder) }}
              </span>
            </span>
          </button>

          <p
            v-if="searchResults.length === 0"
            class="m-0 pt-2 text-[1rem] text-white/46"
          >
            No matching folders.
          </p>
        </div>
      </section>

      <template v-else>
        <div
          v-if="showInitialLoading"
          class="explore-view__skeleton-grid"
          aria-hidden="true"
        >
          <div
            v-for="index in 15"
            :key="index"
            class="explore-view__skeleton"
            :class="index % 6 === 0 ? 'explore-view__skeleton--feature' : ''"
          />
        </div>

        <section
          v-else-if="exploreStore.error"
          class="explore-view__message-card mx-auto"
        >
          <h1 class="m-0 text-[1.15rem] font-semibold text-white">
            Could not load explore
          </h1>
          <p class="m-0 text-white/60">{{ exploreStore.error }}</p>
        </section>

        <section
          v-else-if="rankedItems.length === 0"
          class="explore-view__message-card mx-auto"
        >
          <h1 class="m-0 text-[1.15rem] font-semibold text-white">
            Nothing to explore yet
          </h1>
          <p class="m-0 text-white/60">
            Index a few folders and this page will start surfacing posts here.
          </p>
        </section>

        <template v-else>
          <ExploreGrid :items="rankedItems" />
          <InfiniteLoader
            :loading="exploreStore.loading"
            :has-more="exploreStore.hasMore"
            @load-more="loadMore"
          />
        </template>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"
  import { useRouter } from "vue-router"

  import Avatar from "../components/Avatar.vue"
  import ExploreGrid from "../components/ExploreGrid.vue"
  import InfiniteLoader from "../components/InfiniteLoader.vue"
  import { useAppStore } from "../stores/app"
  import { useExploreStore } from "../stores/explore"
  import { useFoldersStore } from "../stores/folders"
  import { useLikesStore } from "../stores/likes"
  import type { FolderSummary } from "../types/api"
  import { searchFolders, rankExploreItems } from "../utils/explore"
  import { buildLikedCountByFolder } from "../utils/home-recommendations"

  const RESULT_LIMIT = 12

  const appStore = useAppStore()
  const exploreStore = useExploreStore()
  const foldersStore = useFoldersStore()
  const likesStore = useLikesStore()
  const router = useRouter()

  const searchInput = ref<HTMLInputElement | null>(null)
  const searchQuery = ref("")
  const isSearchActive = ref(false)

  const likedCountByFolder = computed(() =>
    buildLikedCountByFolder(likesStore.items),
  )
  const trimmedSearchQuery = computed(() => searchQuery.value.trim())
  const searchResults = computed(() =>
    searchFolders(foldersStore.items, trimmedSearchQuery.value).slice(
      0,
      RESULT_LIMIT,
    ),
  )
  const recentSearchFolders = computed(() =>
    exploreStore.recentSearchSlugs
      .map(
        slug => foldersStore.items.find(folder => folder.slug === slug) ?? null,
      )
      .filter((folder): folder is FolderSummary => folder !== null),
  )
  const rankedItems = computed(() =>
    rankExploreItems(
      exploreStore.items,
      foldersStore.items,
      likedCountByFolder.value,
      appStore.recentOpenedFolderSlugs,
      appStore.lastOpenedFolderSlug,
    ),
  )
  const showInitialLoading = computed(
    () =>
      exploreStore.loading &&
      exploreStore.items.length === 0 &&
      !exploreStore.error,
  )

  function activateSearch() {
    isSearchActive.value = true
  }

  async function closeSearch() {
    searchQuery.value = ""
    isSearchActive.value = false
    await nextTick()
    searchInput.value?.blur()
  }

  async function clearSearch() {
    searchQuery.value = ""
    await nextTick()
    searchInput.value?.focus()
  }

  async function handleEscape() {
    if (searchQuery.value.length > 0) {
      await clearSearch()
      return
    }

    await closeSearch()
  }

  async function openFolder(folder: FolderSummary) {
    exploreStore.recordRecentSearch(folder.slug)
    await router.push({ name: "folder", params: { slug: folder.slug } })
  }

  function describeFolder(folder: FolderSummary): string {
    const location = folder.breadcrumb ?? folder.folderPath
    const postLabel = `${folder.imageCount} post${folder.imageCount === 1 ? "" : "s"}`

    return `${location} • ${postLabel}`
  }

  async function loadMore() {
    await exploreStore.loadMore()
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !isSearchActive.value) {
      return
    }

    void handleEscape()
  }

  onMounted(async () => {
    exploreStore.initializeRecentSearches()

    const tasks: Array<Promise<unknown>> = []
    if (foldersStore.items.length === 0) {
      tasks.push(foldersStore.fetchFolders())
    }

    if (!appStore.isLibraryUnavailable) {
      tasks.push(exploreStore.loadInitial())
    }

    window.addEventListener("keydown", handleWindowKeydown)
    await Promise.all(tasks)
  })

  onUnmounted(() => {
    window.removeEventListener("keydown", handleWindowKeydown)
  })
</script>

<style scoped>
  .explore-view__search {
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .explore-view__result {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    width: 100%;
    padding: 0.65rem 0.3rem;
    border: 0;
    background: transparent;
    cursor: pointer;
    color: inherit;
    transition: background-color 0.15s ease;
  }

  .explore-view__result:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .explore-view__message-card {
    display: grid;
    gap: 0.6rem;
    padding: 1.35rem 1.45rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.04);
  }

  .explore-view__skeleton-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-flow: dense;
    gap: 0.2rem;
  }

  .explore-view__skeleton {
    aspect-ratio: 1 / 1;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.12)
    );
    animation: pulse 1.3s ease-in-out infinite;
  }

  @media (min-width: 1080px) {
    .explore-view__skeleton-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .explore-view__skeleton--feature {
      grid-column: span 2;
      grid-row: span 2;
    }
  }
</style>
