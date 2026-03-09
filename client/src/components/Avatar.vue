<template>
  <div class="avatar">
    <img v-if="src" :src="src" :alt="name" loading="lazy" />
    <span v-else>{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  name: string;
  src: string | null;
}>();

const initials = computed(() =>
  props.name
    .split(' ')
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
);
</script>
