<template>
  <div :class="modal ? 'w-[min(100%,72rem)]' : 'w-[min(100%,72rem)] mx-auto'" @click.stop>
    <ErrorState v-if="viewerStore.error" title="Could not load image" :message="viewerStore.error" />
    <div v-else-if="viewerStore.loading" class="card p-8 text-center">
      <p class="text-muted">Loading image...</p>
    </div>
    <ImageModal
      v-else
      :image="viewerStore.image"
      :folder="folder"
      :is-modal="modal"
      :deleting="viewerStore.deleting"
      @close="emit('close')"
      @delete="confirmDeleteOpen = true"
    />
    <ConfirmDialog
      v-if="confirmDeleteOpen"
      title="Delete this image?"
      message="This image will be permanently deleted from the hard drive. This action cannot be undone."
      :loading="viewerStore.deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import ConfirmDialog from '../components/ConfirmDialog.vue';
import ErrorState from '../components/ErrorState.vue';
import ImageModal from '../components/ImageModal.vue';
import { useAppStore } from '../stores/app';
import { useFeedStore } from '../stores/feed';
import { useLikesStore } from '../stores/likes';
import { useFoldersStore } from '../stores/folders';
import { useViewerStore } from '../stores/viewer';

const props = defineProps<{
  id: string;
  modal?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const appStore = useAppStore();
const feedStore = useFeedStore();
const likesStore = useLikesStore();
const viewerStore = useViewerStore();
const foldersStore = useFoldersStore();
const router = useRouter();
const confirmDeleteOpen = ref(false);

const imageId = computed(() => Number(props.id));
const folder = computed(() =>
  viewerStore.image ? foldersStore.items.find((entry) => entry.slug === viewerStore.image?.folderSlug) ?? null : null
);

async function loadImage() {
  if (Number.isFinite(imageId.value)) {
    await viewerStore.loadImage(imageId.value);
  }
}

onMounted(loadImage);
watch(imageId, loadImage);

async function handleDelete() {
  if (!viewerStore.image) {
    return;
  }

  const currentImage = viewerStore.image;
  const deleted = await viewerStore.deleteImage(currentImage.id);
  confirmDeleteOpen.value = false;

  feedStore.removeImage(deleted.id);
  likesStore.removeImage(deleted.id);
  const removedFolder = foldersStore.removeImage(deleted.id, deleted.folderSlug);
  appStore.removeIndexedImage(removedFolder ? 1 : 0);

  if (props.modal) {
    emit('close');
    return;
  }

  if (removedFolder) {
    await router.replace({ name: 'library' });
    return;
  }

  await router.replace({ name: 'folder', params: { slug: deleted.folderSlug } });
}
</script>
