<template>
  <section class="w-[min(100%,58rem)] mx-auto">
    <EmptyState
      v-if="appStore.isLibraryUnavailable"
      :title="tr('Library storage unavailable', 'Almacenamiento no disponible')"
      :description="appStore.libraryUnavailableReason"
    />
    <section v-else-if="appStore.isRebuilding && likesStore.items.length === 0" class="card p-8 text-center">
      <p class="m-0 text-muted">{{ tr('Rebuilding the library index. Likes will return after the refreshed library finishes loading.', 'Reconstruyendo el índice. Los favoritos volverán cuando termine la carga.') }}</p>
    </section>
    <ErrorState v-else-if="likesStore.error" :title="tr('Could not load likes', 'No se pudieron cargar los favoritos')" :message="likesStore.error" />
    <template v-else>
      <div class="flex justify-center py-[0.95rem] mb-[0.45rem] border-t border-border" aria-label="Likes sections">
        <span class="relative pt-[0.1rem] text-text text-[0.78rem] font-bold tracking-[0.11em] uppercase">
          <span class="absolute left-0 right-0 top-[-1.05rem] h-px bg-text" aria-hidden="true"></span>
          {{ tr('Liked posts', 'Publicaciones favoritas') }}
        </span>
      </div>
      <EmptyState
        v-if="!likesStore.loading && likesStore.items.length === 0"
        :title="tr('No liked posts yet', 'Todavía no hay favoritos')"
        :description="tr('Tap the heart under any post and it will appear here.', 'Pulsa el corazón de una publicación para verla aquí.')"
      />
      <div v-else-if="likesStore.loading" class="card p-8 text-center">
        <p class="text-muted">{{ tr('Loading likes...', 'Cargando favoritos...') }}</p>
      </div>
      <FolderGrid v-else :items="likesStore.items" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import EmptyState from '../components/EmptyState.vue';
import ErrorState from '../components/ErrorState.vue';
import FolderGrid from '../components/FolderGrid.vue';
import { useAppStore } from '../stores/app';
import { useLikesStore } from '../stores/likes';
import { useLocaleStore } from '../stores/locale';

const appStore = useAppStore();
const likesStore = useLikesStore();
const localeStore = useLocaleStore();
const tr = (english: string, spanish: string) => localeStore.text(english, spanish);

onMounted(async () => {
  if (appStore.isLibraryUnavailable) {
    return;
  }

  await likesStore.initialize();
});
</script>
