<template>
  <section class="w-[min(100%,72rem)] mx-auto px-6 py-10 flex items-center justify-center" style="background: radial-gradient(circle at top, rgba(0,149,246,0.14), transparent 32%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 86%, #ffffff 14%) 0%, var(--bg) 100%);">
    <div class="w-full max-w-[27rem] rounded-[1.5rem] border border-border bg-surface p-8 shadow-[var(--shadow)]">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-[1rem] text-white shadow-[0_16px_34px_rgba(0,149,246,0.24)]" style="background: linear-gradient(135deg, #0095f6 0%, #1877f2 100%);">
          <BrandMark />
        </div>
        <div>
          <p class="m-0 text-[0.74rem] font-bold uppercase tracking-[0.08em] text-accent-strong">{{ tr('Administration', 'Administración') }}</p>
          <h1 class="m-0 text-[1.5rem] font-semibold tracking-[-0.04em]">{{ tr('Admin sign in', 'Acceso de administración') }}</h1>
        </div>
      </div>

      <p class="mt-5 mb-0 text-[0.95rem] leading-[1.65] text-muted">
        {{ tr('The gallery is public. Sign in here only to upload, edit, scan, or delete content.', 'La galería es pública. Inicia sesión aquí solo para subir, editar, escanear o eliminar contenido.') }}
      </p>

      <form class="mt-6 grid gap-4" @submit.prevent="submitLogin">
        <label class="grid gap-[0.45rem]">
          <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('Password', 'Contraseña') }}</span>
          <input
            v-model="password"
            class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
            type="password"
            autocomplete="current-password"
            :placeholder="tr('Enter admin password', 'Introduce la contraseña de administración')"
            :disabled="submitting"
          />
        </label>

        <p v-if="errorMessage" class="m-0 rounded-[0.95rem] border border-[rgba(214,48,49,0.24)] bg-[rgba(214,48,49,0.08)] px-4 py-3 text-[0.88rem] text-[#c0392b]">
          {{ errorMessage }}
        </p>

        <button class="btn-primary min-h-12 justify-center" type="submit" :disabled="submitting || password.length === 0">
          {{ submitting ? tr('Signing in...', 'Iniciando sesión...') : tr('Sign In as Admin', 'Entrar como administrador') }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BrandMark from './BrandMark.vue';
import { useAuthStore } from '../stores/auth';
import { useLocaleStore } from '../stores/locale';

const authStore = useAuthStore();
const localeStore = useLocaleStore();
const tr = (english: string, spanish: string) => localeStore.text(english, spanish);
const route = useRoute();
const router = useRouter();
const password = ref('');
const submitting = ref(false);
const localError = ref<string | null>(null);
const errorMessage = computed(() => localError.value ?? authStore.error);

async function submitLogin() {
  if (submitting.value || password.value.length === 0) {
    return;
  }

  submitting.value = true;
  localError.value = null;
  authStore.clearError();

  try {
    await authStore.login(password.value);
    password.value = '';
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/manage';
    await router.replace(redirect);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    localError.value = localeStore.isSpanish && message === 'Incorrect password.'
      ? 'Contraseña incorrecta.'
      : message || tr('Unable to sign in.', 'No se pudo iniciar sesión.');
  } finally {
    submitting.value = false;
  }
}
</script>
