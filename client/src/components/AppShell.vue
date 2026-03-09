<template>
  <div class="shell">
    <SidebarNav class="shell__sidebar" />
    <div class="shell__content">
      <TopNav />
      <main class="shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import SidebarNav from './SidebarNav.vue';
import TopNav from './TopNav.vue';
</script>
