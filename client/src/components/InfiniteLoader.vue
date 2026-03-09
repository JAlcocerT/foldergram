<template>
  <div ref="sentinel" class="infinite-loader">
    <button v-if="showButton" class="infinite-loader__button" type="button" @click="$emit('load-more')">
      Load more
    </button>
    <span v-else-if="loading" class="infinite-loader__label">Loading more...</span>
    <span v-else class="infinite-loader__label">You are caught up</span>
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
