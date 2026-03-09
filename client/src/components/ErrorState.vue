<template>
  <section class="panel panel--centered panel--error">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
}>();
</script>
