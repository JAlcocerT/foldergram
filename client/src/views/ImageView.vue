<template>
  <div :class="containerClass" @click.stop>
    <ErrorState v-if="viewerStore.error" title="Could not load image" :message="viewerStore.error" />
    <div v-else-if="viewerStore.loading" class="panel panel--centered">
      <p>Loading image...</p>
    </div>
    <ImageModal
      v-else
      :image="viewerStore.image"
      :profile="profile"
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
import { useProfilesStore } from '../stores/profiles';
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
const profilesStore = useProfilesStore();
const router = useRouter();
const confirmDeleteOpen = ref(false);

const imageId = computed(() => Number(props.id));
const containerClass = computed(() => (props.modal ? 'route-modal__content' : 'content-column content-column--wide'));
const profile = computed(() =>
  viewerStore.image ? profilesStore.items.find((entry) => entry.slug === viewerStore.image?.profileSlug) ?? null : null
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
  profilesStore.removeImage(deleted.id, deleted.profileSlug);
  appStore.removeIndexedImage();

  if (props.modal) {
    emit('close');
    return;
  }

  await router.replace({ name: 'profile', params: { slug: deleted.profileSlug } });
}
</script>
