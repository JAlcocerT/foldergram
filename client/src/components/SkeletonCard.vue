<template>
  <div class="skeleton bg-transparent">
    <div class="flex items-center gap-[0.72rem] px-4 py-[0.55rem]">
      <div class="skeleton__avatar w-8 h-8 rounded-full shrink-0"></div>
      <div class="skeleton__lines flex flex-col gap-[0.45rem] w-28">
        <span class="block h-[0.8rem] rounded-full"></span>
      </div>
    </div>
    <div class="skeleton__media aspect-square rounded-[0.5rem] border border-border"></div>
  </div>
</template>

<script setup lang="ts"></script>
