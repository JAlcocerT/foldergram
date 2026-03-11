<template>
  <div class="card overflow-hidden skeleton">
    <div class="flex items-center gap-3 px-4 min-h-[3.65rem]">
      <div class="skeleton__avatar w-[2.65rem] h-[2.65rem] rounded-full shrink-0"></div>
      <div class="skeleton__lines flex flex-col gap-[0.45rem] w-48">
        <span class="block h-[0.8rem] rounded-full"></span>
        <span class="block h-[0.8rem] rounded-full w-3/5"></span>
      </div>
    </div>
    <div class="skeleton__media aspect-square"></div>
  </div>
</template>

<script setup lang="ts"></script>
