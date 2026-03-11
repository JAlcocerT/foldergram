<template>
  <img
    v-if="resolvedSrc"
    :src="resolvedSrc"
    :alt="alt"
    :loading="loading"
    :data-loaded="loaded ? 'true' : 'false'"
    @load="handleLoad"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    src: string | null;
    alt: string;
    loading?: 'lazy' | 'eager';
    retryWhile?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
  }>(),
  {
    src: null,
    loading: 'lazy',
    retryWhile: false,
    maxRetries: 8,
    retryDelayMs: 1500
  }
);

const attempt = ref(0);
const loaded = ref(false);
const hiddenUntilRetry = ref(false);
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const resolvedSrc = computed(() => {
  if (!props.src || hiddenUntilRetry.value) {
    return null;
  }

  if (attempt.value === 0) {
    return props.src;
  }

  const separator = props.src.includes('?') ? '&' : '?';
  return `${props.src}${separator}retry=${attempt.value}`;
});

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function resetState() {
  clearRetryTimer();
  attempt.value = 0;
  loaded.value = false;
  hiddenUntilRetry.value = false;
}

function scheduleRetry() {
  if (!props.src || retryTimer) {
    return;
  }

  const canRetry = props.retryWhile || attempt.value < props.maxRetries;
  if (!canRetry) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    hiddenUntilRetry.value = false;
    attempt.value += 1;
  }, props.retryDelayMs);
}

function handleLoad() {
  clearRetryTimer();
  loaded.value = true;
}

function handleError() {
  loaded.value = false;

  const canRetry = props.retryWhile || attempt.value < props.maxRetries;
  if (!canRetry) {
    hiddenUntilRetry.value = true;
    return;
  }

  hiddenUntilRetry.value = true;
  scheduleRetry();
}

watch(() => props.src, resetState);
watch(
  () => props.retryWhile,
  (retryWhile) => {
    if (retryWhile && hiddenUntilRetry.value) {
      scheduleRetry();
    }
  }
);

onBeforeUnmount(clearRetryTimer);
</script>
