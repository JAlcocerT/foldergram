<template>
  <div class="confirm-dialog__backdrop" @click.self="$emit('cancel')">
    <section class="confirm-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div class="confirm-dialog__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="presentation">
          <path
            d="M12 8.5v4m0 3h.01M10.2 4.9 3.9 16a1.5 1.5 0 0 0 1.3 2.25h13.6A1.5 1.5 0 0 0 20.1 16L13.8 4.9a1.5 1.5 0 0 0-2.6 0Z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </div>
      <div class="confirm-dialog__copy">
        <h2 :id="titleId">{{ title }}</h2>
        <p>{{ message }}</p>
      </div>
      <div class="confirm-dialog__actions">
        <button class="confirm-dialog__button confirm-dialog__button--secondary" type="button" @click="$emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button class="confirm-dialog__button confirm-dialog__button--danger" type="button" :disabled="loading" @click="$emit('confirm')">
          {{ loading ? loadingLabel : confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loadingLabel?: string;
    loading?: boolean;
  }>(),
  {
    confirmLabel: 'Delete image',
    cancelLabel: 'Cancel',
    loadingLabel: 'Deleting...',
    loading: false
  }
);

defineEmits<{
  cancel: [];
  confirm: [];
}>();

const titleId = `confirm-dialog-title-${Math.random().toString(36).slice(2, 10)}`;
</script>
