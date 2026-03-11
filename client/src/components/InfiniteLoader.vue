<template>
  <div ref="sentinel" class="flex justify-center pt-[1.2rem]">
    <button
      v-if="showButton"
      class="btn-primary min-w-[8.5rem]"
      type="button"
      @click="$emit('load-more')"
    >
      Load more
    </button>
    <span v-else-if="loading" class="text-muted">Loading more...</span>
    <span v-else class="text-muted">You are caught up</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  loading: boolean;
  hasMore: boolean;
}>();

const emit = defineEmits<{
  'load-more': [];
}>();

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const showButton = computed(() => !props.loading && props.hasMore);

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting) && props.hasMore && !props.loading) {
      emit('load-more');
    }
  });

  if (sentinel.value) {
    observer.observe(sentinel.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>
