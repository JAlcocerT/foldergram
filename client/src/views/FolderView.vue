<template>
  <section class="w-full">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      class="mx-auto w-[min(100%,56rem)]"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <section
      v-else-if="appStore.isRebuilding && !foldersStore.currentFolder"
      class="card mx-auto w-[min(100%,56rem)] p-8 text-center"
    >
      <p class="m-0 text-muted">
        Rebuilding the library index. Folder content will return as soon as this
        scan reaches it.
      </p>
    </section>
    <ErrorState
      v-else-if="foldersStore.folderError"
      class="mx-auto w-[min(100%,56rem)]"
      title="Could not load folder"
      :message="foldersStore.folderError"
    />
    <template v-else-if="foldersStore.currentFolder">
      <div class="mx-auto grid w-full max-w-[69rem] gap-[0.15rem]">
        <div class="mx-auto w-[min(100%,54rem)]">
          <FolderHeader :folder="foldersStore.currentFolder" />
        </div>
        <EmptyState
          v-if="
            !foldersStore.loadingFolder &&
            foldersStore.currentImages.length === 0
          "
          class="mx-auto w-[min(100%,66.5625rem)]"
          :title="
            activeTab === 'reels'
              ? 'No reels in this folder'
              : 'No posts in this folder'
          "
          :description="
            activeTab === 'reels'
              ? 'Drop supported videos into this folder and rescan to see them in the reels tab.'
              : 'Drop supported photos or videos into this folder and rescan to see them here.'
          "
        />
        <template v-else>
          <section class="mx-auto w-[min(100%,66.5625rem)]">
            <div class="flex justify-center border-b border-border" aria-label="Folder sections">
              <div class="flex items-center gap-40 pt-[0.2rem] max-sm:gap-[2.9rem] max-sm:pt-[0.12rem]">
                <button
                  class="relative inline-flex h-[2.2rem] w-[3.15rem] cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted transition-colors duration-[180ms] hover:text-text"
                  :class="activeTab === 'posts' ? 'text-text' : ''"
                  type="button"
                  aria-label="Posts"
                  title="Posts"
                  :aria-pressed="activeTab === 'posts'"
                  @click="setTab('posts')"
                >
                  <svg
                    class="w-7 h-7 mb-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="4" height="4" rx="0.75" />
                    <rect x="10" y="3" width="4" height="4" rx="0.75" />
                    <rect x="17" y="3" width="4" height="4" rx="0.75" />
                    <rect x="3" y="10" width="4" height="4" rx="0.75" />
                    <rect x="10" y="10" width="4" height="4" rx="0.75" />
                    <rect x="17" y="10" width="4" height="4" rx="0.75" />
                    <rect x="3" y="17" width="4" height="4" rx="0.75" />
                    <rect x="10" y="17" width="4" height="4" rx="0.75" />
                    <rect x="17" y="17" width="4" height="4" rx="0.75" />
                  </svg>
                  <span
                    v-if="activeTab === 'posts'"
                    class="absolute bottom-[0.02rem] left-[0.15rem] right-[0.15rem] h-[2px] rounded-full bg-current"
                    aria-hidden="true"
                  ></span>
                </button>
                <button
                  v-if="hasReelsTab"
                  class="relative inline-flex h-[2.2rem] w-[3.15rem] cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted transition-colors duration-[180ms] hover:text-text"
                  :class="activeTab === 'reels' ? 'text-text' : ''"
                  type="button"
                  aria-label="Reels"
                  title="Reels"
                  :aria-pressed="activeTab === 'reels'"
                  @click="setTab('reels')"
                >
                  <span
                    class="i-fluent-play-circle-24-filled w-7 h-7 mb-3"
                    aria-hidden="true"
                  />
                  <span
                    v-if="activeTab === 'reels'"
                    class="absolute bottom-[0.02rem] left-[0.15rem] right-[0.15rem] h-[2px] rounded-full bg-current"
                    aria-hidden="true"
                  ></span>
                </button>
              </div>
            </div>
            <FolderGrid
              :items="foldersStore.currentImages"
              :variant="activeTab"
            />
            <div class="pt-6">
              <InfiniteLoader
                :loading="foldersStore.loadingFolder"
                :has-more="foldersStore.currentHasMore"
                @load-more="loadMore"
              />
            </div>
          </section>
        </template>
      </div>
    </template>
    <EmptyState
      v-else-if="hasLoadedOnce && !foldersStore.loadingFolder"
      class="mx-auto w-[min(100%,56rem)]"
      title="No direct posts in this app folder"
      description="This source folder no longer has direct photos or videos. Browse the library to continue."
    />
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue"
  import { useRoute, useRouter } from "vue-router"

  import EmptyState from "../components/EmptyState.vue"
  import ErrorState from "../components/ErrorState.vue"
  import InfiniteLoader from "../components/InfiniteLoader.vue"
  import FolderGrid from "../components/FolderGrid.vue"
  import FolderHeader from "../components/FolderHeader.vue"
  import { useAppStore } from "../stores/app"
  import { useFoldersStore } from "../stores/folders"

  const props = defineProps<{
    slug: string
  }>()

  const appStore = useAppStore()
  const foldersStore = useFoldersStore()
  const route = useRoute()
  const router = useRouter()
  const hasLoadedOnce = ref(false)
  const activeTab = computed(() =>
    route.query.tab === "reels" ? "reels" : "posts",
  )
  const hasReelsTab = computed(
    () => (foldersStore.currentFolder?.videoCount ?? 0) > 0,
  )

  async function loadFolder() {
    if (appStore.isLibraryUnavailable) {
      hasLoadedOnce.value = true
      return
    }

    await foldersStore.loadFolder(
      props.slug,
      true,
      activeTab.value === "reels" ? "video" : undefined,
    )

    if (activeTab.value === "reels" && !hasReelsTab.value) {
      await router.replace({
        name: "folder",
        params: { slug: props.slug },
        query: Object.fromEntries(
          Object.entries(route.query).filter(([key]) => key !== "tab"),
        ),
      })
      return
    }

    hasLoadedOnce.value = true
  }

  async function loadMore() {
    if (foldersStore.currentHasMore) {
      await foldersStore.loadFolder(
        props.slug,
        false,
        activeTab.value === "reels" ? "video" : undefined,
      )
    }
  }

  async function setTab(tab: "posts" | "reels") {
    if (activeTab.value === tab) {
      return
    }

    const nextQuery =
      tab === "reels"
        ? { ...route.query, tab: "reels" }
        : Object.fromEntries(
            Object.entries(route.query).filter(([key]) => key !== "tab"),
          )

    await router.replace({
      name: "folder",
      params: { slug: props.slug },
      query: nextQuery,
    })
  }

  onMounted(loadFolder)
  watch(
    () => [props.slug, activeTab.value] as const,
    async () => {
      hasLoadedOnce.value = false
      await loadFolder()
    },
  )
</script>
