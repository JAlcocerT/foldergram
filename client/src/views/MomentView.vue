<template>
  <section class="w-[min(100%,58rem)] mx-auto">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      title="Library storage unavailable"
      :description="appStore.libraryUnavailableReason"
    />
    <section v-else-if="appStore.isRebuilding && !momentsStore.currentMoment" class="card p-8 text-center">
      <p class="m-0 text-muted">Rebuilding the library index. This view will repopulate when the refreshed home rail is ready.</p>
    </section>
    <ErrorState
      v-else-if="momentsStore.momentError"
      :title="`Could not load ${momentsStore.railSingularLabel.toLowerCase()}`"
      :message="momentsStore.momentError"
    />
    <section v-else-if="momentsStore.loadingMoment && !momentsStore.currentMoment" class="card p-8 text-center">
      <p class="m-0 text-muted">Loading {{ momentsStore.railSingularLabel.toLowerCase() }}...</p>
    </section>
    <template v-else-if="momentsStore.currentMoment">
      <header class="grid gap-5 p-5 mb-5 border border-border rounded-[1.25rem] bg-surface shadow-[var(--shadow)] md:grid-cols-[6.5rem_minmax(0,1fr)]">
        <div class="overflow-hidden rounded-[1.1rem] aspect-square bg-surface-alt">
          <img
            class="block object-cover w-full h-full"
            :src="momentsStore.currentMoment.coverImage.thumbnailUrl"
            :alt="momentsStore.currentMoment.title"
            loading="lazy"
          />
        </div>
        <div class="grid gap-[0.55rem]">
          <span class="text-[0.74rem] font-bold tracking-[0.11em] uppercase text-accent-strong">{{ momentsStore.railSingularLabel }}</span>
          <div class="grid gap-[0.2rem]">
            <h1 class="m-0 text-[1.7rem] leading-tight">{{ momentsStore.currentMoment.title }}</h1>
            <p class="m-0 text-[0.96rem] text-muted">{{ momentsStore.currentMoment.subtitle }}</p>
          </div>
          <div class="flex flex-wrap gap-3 text-[0.82rem] text-muted">
            <span>{{ momentsStore.currentMoment.imageCount }} posts</span>
            <span>{{ momentsStore.currentMoment.dateContext }}</span>
          </div>
        </div>
      </header>

      <FeedList :items="momentsStore.currentImages" :show-skeleton="!hasLoadedOnce && momentsStore.loadingMoment" />
      <InfiniteLoader
        :loading="momentsStore.loadingMoment"
        :has-more="momentsStore.currentHasMore"
        @load-more="loadMore"
      />
    </template>
    <EmptyState
      v-else-if="hasLoadedOnce && !momentsStore.loadingMoment"
      :title="`This ${momentsStore.railSingularLabel.toLowerCase()} is empty`"
      :description="`Try another ${momentsStore.railSingularLabel.toLowerCase()} from the homepage.`"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import FeedList from '../components/FeedList.vue';
import InfiniteLoader from '../components/InfiniteLoader.vue';
import { useAppStore } from '../stores/app';
import { useMomentsStore } from '../stores/moments';

const props = defineProps<{
  id: string;
}>();

const appStore = useAppStore();
const momentsStore = useMomentsStore();
const hasLoadedOnce = ref(false);

async function loadMoment() {
  if (appStore.isLibraryUnavailable) {
    hasLoadedOnce.value = true;
    return;
  }

  await momentsStore.loadMoment(props.id, true);
  hasLoadedOnce.value = true;
}

async function loadMore() {
  if (momentsStore.currentHasMore) {
    await momentsStore.loadMoment(props.id, false);
  }
}

onMounted(loadMoment);
watch(
  () => props.id,
  async () => {
    hasLoadedOnce.value = false;
    await loadMoment();
  }
);
</script>
