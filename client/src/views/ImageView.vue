<template>
  <div :class="modal ? 'w-[min(100%,72rem)]' : 'w-[min(100%,72rem)] mx-auto'" @click.stop>
    <ErrorState v-if="viewerStore.error" title="Could not load post" :message="viewerStore.error" />
    <div v-else-if="viewerStore.loading" class="card p-8 text-center">
      <p class="text-muted">Loading post...</p>
    </div>
    <ImageModal
      v-else
      :image="viewerStore.image"
      :folder="folder"
      :is-modal="modal"
      :deleting="viewerStore.deleting"
      :can-delete="authStore.isAdmin"
      @close="emit('close')"
      @delete="openDeleteDialog"
    />
    <ConfirmDialog
      v-if="confirmDeleteOpen"
      :title="tr('Delete this post?', '¿Eliminar esta publicación?')"
      :message="deleteDialogMessage"
      :confirm-label="deleteDialogConfirmLabel"
      :loading="viewerStore.deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="handleDelete"
    >
      <template #details>
        <label class="flex items-start gap-3 mt-3 cursor-pointer select-none">
          <input
            v-model="deleteOriginalFromDisk"
            class="mt-[0.2rem]"
            type="checkbox"
            :disabled="viewerStore.deleting"
          />
          <span class="grid gap-[0.18rem]">
            <span class="text-[0.92rem] font-semibold text-text">{{ tr('Also permanently delete original file from disk', 'Eliminar también el archivo original del disco') }}</span>
            <span class="text-[0.84rem] text-muted">{{ tr('Keep this unchecked to move the post to Trash while keeping the source file on disk.', 'Déjalo sin marcar para mover la publicación a la Papelera y conservar el archivo original.') }}</span>
          </span>
        </label>
        <p
          v-if="deleteOriginalFromDisk"
          class="m-0 mt-3 px-3 py-[0.8rem] rounded-[0.9rem] border border-[rgba(217,48,37,0.24)] text-[0.84rem] text-[#b42318] bg-[rgba(217,48,37,0.08)]"
        >
          {{ tr('This will permanently delete the original file, thumbnail, and preview from disk. This action cannot be undone.', 'Se eliminarán definitivamente el archivo original, la miniatura y la vista previa. Esta acción no se puede deshacer.') }}
        </p>
        <p
          v-if="deleteError"
          class="m-0 mt-3 px-3 py-[0.8rem] rounded-[0.9rem] border border-[rgba(217,48,37,0.24)] text-[0.84rem] text-[#b42318] bg-[rgba(217,48,37,0.08)]"
        >
          {{ deleteError }}
        </p>
      </template>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ConfirmDialog from '../components/ConfirmDialog.vue';
import ErrorState from '../components/ErrorState.vue';
import ImageModal from '../components/ImageModal.vue';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';
import { useLikesStore } from '../stores/likes';
import { useFoldersStore } from '../stores/folders';
import { useMomentsStore } from '../stores/moments';
import { useLocaleStore } from '../stores/locale';
import { useViewerStore } from '../stores/viewer';

const props = defineProps<{
  id: string;
  modal?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const appStore = useAppStore();
const authStore = useAuthStore();
const feedStore = useFeedStore();
const likesStore = useLikesStore();
const viewerStore = useViewerStore();
const foldersStore = useFoldersStore();
const momentsStore = useMomentsStore();
const localeStore = useLocaleStore();
const tr = (english: string, spanish: string) => localeStore.text(english, spanish);
const route = useRoute();
const router = useRouter();
const confirmDeleteOpen = ref(false);
const deleteOriginalFromDisk = ref(false);
const deleteError = ref<string | null>(null);

const imageId = computed(() => Number(props.id));
const activeMediaType = computed(() => (route.query.tab === 'reels' ? 'video' : undefined));
const folder = computed(() =>
  viewerStore.image ? foldersStore.items.find((entry) => entry.slug === viewerStore.image?.folderSlug) ?? null : null
);
const deleteDialogMessage = computed(() =>
  deleteOriginalFromDisk.value
    ? tr('This will permanently delete the post from the app and remove original media from disk.', 'La publicación y su archivo original se eliminarán definitivamente.')
    : tr('This will delete the post from the app and move it to Trash. The original file will stay on disk unless you choose permanent deletion.', 'La publicación se moverá a la Papelera. El archivo original permanecerá en el disco.')
);
const deleteDialogConfirmLabel = computed(() => deleteOriginalFromDisk.value ? tr('Permanently Delete', 'Eliminar definitivamente') : tr('Delete', 'Eliminar'));

async function loadImage() {
  if (Number.isFinite(imageId.value)) {
    await viewerStore.loadImage(imageId.value, activeMediaType.value);
  }
}

onMounted(loadImage);
watch(() => [imageId.value, activeMediaType.value] as const, loadImage);

function openDeleteDialog() {
  if (!authStore.isAdmin) return;
  deleteOriginalFromDisk.value = false;
  deleteError.value = null;
  confirmDeleteOpen.value = true;
}

async function handleDelete() {
  if (!viewerStore.image) {
    return;
  }

  const currentImage = viewerStore.image;
  deleteError.value = null;

  try {
    const deleted = await viewerStore.deleteImage(currentImage.id, {
      permanent: deleteOriginalFromDisk.value
    });
    confirmDeleteOpen.value = false;
    deleteOriginalFromDisk.value = false;

    feedStore.removeImage(deleted.id);
    likesStore.removeImage(deleted.id);
    const removedFolder = foldersStore.removeImage(deleted.id, deleted.folderSlug, currentImage.mediaType);
    momentsStore.removeImage(deleted.id);
    appStore.removeIndexedImage(removedFolder ? 1 : 0, currentImage.mediaType);

    if (props.modal) {
      emit('close');
      return;
    }

    if (removedFolder) {
      await router.replace({ name: 'library' });
      return;
    }

    await router.replace({ name: 'folder', params: { slug: deleted.folderSlug } });
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Unable to delete post';
  }
}
</script>
