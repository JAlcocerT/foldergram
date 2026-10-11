<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.4rem]">
    <header class="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">{{ tr('Administration', 'Administración') }}</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">
          {{ tr('Manage content', 'Gestionar contenido') }}
        </h1>
        <p class="m-0 mt-1 text-muted">{{ tr('Create galleries, upload media, and edit Hugo-compatible metadata.', 'Crea galerías, sube archivos y edita metadatos compatibles con Hugo.') }}</p>
      </div>
      <button
        v-if="authStore.isAdmin"
        class="btn-primary"
        type="button"
        :disabled="scanning || appStore.isScanning"
        @click="runScan"
      >
        {{ scanning || appStore.isScanning ? tr('Scanning…', 'Escaneando…') : tr('Scan library', 'Escanear biblioteca') }}
      </button>
    </header>

    <section v-if="!authStore.isAdmin" class="card p-8 grid gap-4">
      <div>
        <h2 class="m-0 text-[1.1rem]">{{ tr('Password protection required', 'Se requiere contraseña') }}</h2>
        <p class="m-0 mt-2 text-muted">
          {{ tr('Content management requires an administrator session.', 'La gestión de contenido requiere una sesión de administrador.') }}
        </p>
      </div>
      <RouterLink class="btn-primary w-fit" :to="{ name: 'settings' }">{{ tr('Open settings', 'Abrir configuración') }}</RouterLink>
    </section>

    <template v-else>
      <p
        v-if="pageMessage"
        class="m-0 px-4 py-[0.85rem] border rounded-[0.9rem]"
        :class="pageError ? 'border-[rgba(214,48,49,0.24)] text-[#c0392b] bg-[rgba(214,48,49,0.08)]' : 'border-[rgba(28,164,78,0.22)] text-[#16833e] bg-[rgba(28,164,78,0.08)]'"
      >
        {{ pageMessage }}
      </p>

      <section class="grid grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.5fr)] gap-[1.25rem] max-lg:grid-cols-1">
        <aside class="flex flex-col gap-[1.15rem]">
          <section class="card p-6 grid gap-4">
            <div>
              <h2 class="m-0 text-[1.05rem]">{{ tr('Choose a gallery', 'Elegir una galería') }}</h2>
              <p class="m-0 mt-1 text-sm text-muted">{{ tr('Select any indexed media folder.', 'Selecciona cualquier carpeta multimedia indexada.') }}</p>
            </div>
            <select
              v-model="selectedFolderPath"
              class="w-full h-11 px-3 border border-border rounded-[0.75rem] text-text bg-surface-alt focus:outline-none focus:border-accent/40"
            >
              <option value="">{{ tr('Select a folder…', 'Selecciona una carpeta…') }}</option>
              <option v-for="folder in folderOptions" :key="folder.path" :value="folder.path">
                {{ folder.label }}
              </option>
            </select>
          </section>

          <form class="card p-6 grid gap-4" @submit.prevent="createFolder">
            <div>
              <h2 class="m-0 text-[1.05rem]">{{ tr('Create a gallery', 'Crear una galería') }}</h2>
              <p class="m-0 mt-1 text-sm text-muted">{{ tr('Nested paths are supported, for example', 'Se admiten rutas anidadas, por ejemplo') }} <code>Tejido/Bebé</code>.</p>
            </div>
            <label class="grid gap-1.5 text-sm font-semibold">
              {{ tr('Folder path', 'Ruta de la carpeta') }}
              <input v-model.trim="newFolder.folderPath" class="form-control" required maxlength="500" :placeholder="tr('Projects/New gallery', 'Proyectos/Nueva galería')" />
            </label>
            <label class="grid gap-1.5 text-sm font-semibold">
              {{ tr('Gallery title', 'Título de la galería') }}
              <input v-model="newFolder.title" class="form-control" maxlength="200" :placeholder="tr('New gallery', 'Nueva galería')" />
            </label>
            <label class="grid gap-1.5 text-sm font-semibold">
              {{ tr('Description', 'Descripción') }}
              <textarea v-model="newFolder.description" class="form-control min-h-24 resize-y" maxlength="5000" :placeholder="tr('What is this gallery about?', '¿De qué trata esta galería?')"></textarea>
            </label>
            <button class="btn-primary" type="submit" :disabled="creating">
              {{ creating ? tr('Creating…', 'Creando…') : tr('Create gallery', 'Crear galería') }}
            </button>
          </form>
        </aside>

        <main class="min-w-0">
          <section v-if="loadingMetadata" class="card p-10 text-center text-muted">{{ tr('Loading gallery…', 'Cargando galería…') }}</section>
          <section v-else-if="!metadata" class="card p-10 text-center">
            <h2 class="m-0 text-[1.05rem]">{{ tr('Select or create a gallery', 'Selecciona o crea una galería') }}</h2>
            <p class="m-0 mt-2 text-muted">{{ tr('Its uploads and text fields will appear here.', 'Sus archivos y campos de texto aparecerán aquí.') }}</p>
          </section>
          <div v-else class="flex flex-col gap-[1.15rem]">
            <form class="card p-6 grid gap-5" @submit.prevent="saveMetadata">
              <div class="flex items-start justify-between gap-4 max-sm:flex-col">
                <div class="min-w-0">
                  <h2 class="m-0 text-[1.05rem]">{{ tr('Gallery text', 'Texto de la galería') }}</h2>
                  <p class="m-0 mt-1 text-sm text-muted break-all">
                    {{ metadata.folderPath }}/{{ metadata.metadataFilename }}
                  </p>
                </div>
                <button class="btn-primary shrink-0" type="submit" :disabled="saving">
                  {{ saving ? tr('Saving…', 'Guardando…') : tr('Save text', 'Guardar texto') }}
                </button>
              </div>
              <label class="grid gap-1.5 text-sm font-semibold">
                {{ tr('Title', 'Título') }}
                <input v-model="metadata.title" class="form-control" maxlength="200" />
              </label>
              <label class="grid gap-1.5 text-sm font-semibold">
                {{ tr('Description', 'Descripción') }}
                <textarea v-model="metadata.description" class="form-control min-h-28 resize-y" maxlength="5000"></textarea>
              </label>

              <div class="grid gap-3">
                <div>
                  <h3 class="m-0 text-[0.95rem]">{{ tr('Photo and video captions', 'Textos de fotos y vídeos') }}</h3>
                  <p class="m-0 mt-1 text-sm text-muted">{{ tr('Captions are stored in the frontmatter resources list.', 'Los textos se guardan en la lista resources del frontmatter.') }}</p>
                </div>
                <p v-if="metadata.media.length === 0" class="m-0 p-4 rounded-[0.8rem] bg-surface-alt text-muted">
                  {{ tr('Upload media below to add captions.', 'Sube archivos abajo para añadir textos.') }}
                </p>
                <label
                  v-for="item in metadata.media"
                  :key="item.filename"
                  class="grid grid-cols-[minmax(9rem,0.55fr)_minmax(0,1fr)] gap-3 items-center max-sm:grid-cols-1 p-3 rounded-[0.8rem] bg-surface-alt"
                >
                  <span class="text-sm font-semibold truncate" :title="item.filename">{{ item.filename }}</span>
                  <input v-model="item.caption" class="form-control" maxlength="1000" :aria-label="`${tr('Caption for', 'Texto para')} ${item.filename}`" />
                </label>
              </div>
            </form>

            <form class="card p-6 grid gap-4" @submit.prevent="uploadFiles">
              <div>
                <h2 class="m-0 text-[1.05rem]">{{ tr('Upload media', 'Subir archivos') }}</h2>
                <p class="m-0 mt-1 text-sm text-muted">{{ tr('Up to 100 supported photos or videos, 100 MB each.', 'Hasta 100 fotos o vídeos compatibles, de 100 MB cada uno.') }}</p>
              </div>
              <input
                :key="fileInputKey"
                class="block w-full text-sm text-muted file:mr-4 file:px-4 file:py-2 file:border-0 file:rounded-[0.7rem] file:bg-accent-soft file:text-accent-strong file:font-semibold file:cursor-pointer"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.m4v,.webm,.mkv"
                multiple
                required
                @change="selectFiles"
              />
              <p v-if="selectedFiles.length" class="m-0 text-sm text-muted">
                {{ selectedFiles.length }} {{ selectedFiles.length === 1 ? tr('file selected', 'archivo seleccionado') : tr('files selected', 'archivos seleccionados') }}
              </p>
              <button class="btn-primary w-fit" type="submit" :disabled="uploading || selectedFiles.length === 0">
                {{ uploading ? tr('Uploading…', 'Subiendo…') : tr('Upload files', 'Subir archivos') }}
              </button>
            </form>
          </div>
        </main>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import {
  createManagedFolder,
  fetchManagedFolderMetadata,
  fetchManagedFolders,
  triggerManualScan,
  updateManagedFolderMetadata,
  uploadManagedMedia
} from '../api/gallery';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { useFoldersStore } from '../stores/folders';
import { useLocaleStore } from '../stores/locale';
import type { ManagedFolderMetadata, ManagedFolderSummary } from '../types/api';

const appStore = useAppStore();
const authStore = useAuthStore();
const foldersStore = useFoldersStore();
const localeStore = useLocaleStore();
const tr = (english: string, spanish: string) => localeStore.text(english, spanish);
const selectedFolderPath = ref('');
const metadata = ref<ManagedFolderMetadata | null>(null);
const originalCaptions = ref<Record<string, string>>({});
const selectedFiles = ref<File[]>([]);
const managedFolders = ref<ManagedFolderSummary[]>([]);
const fileInputKey = ref(0);
const creating = ref(false);
const loadingMetadata = ref(false);
const saving = ref(false);
const uploading = ref(false);
const scanning = ref(false);
const pageMessage = ref('');
const pageError = ref(false);
const newFolder = reactive({ folderPath: '', title: '', description: '' });

const folderOptions = computed(() => {
  const indexedByPath = new Map(foldersStore.items.map((folder) => [folder.folderPath, folder]));
  const options = managedFolders.value.map((folder) => {
    const indexed = indexedByPath.get(folder.folderPath);
    return {
      path: folder.folderPath,
      label: indexed?.breadcrumb ? `${indexed.breadcrumb} / ${indexed.name}` : folder.title
    };
  });
  if (selectedFolderPath.value && !options.some((option) => option.path === selectedFolderPath.value)) {
    options.unshift({ path: selectedFolderPath.value, label: selectedFolderPath.value });
  }
  return options.sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
});

function showMessage(message: string, isError = false) {
  pageMessage.value = message;
  pageError.value = isError;
}

function applyMetadata(nextMetadata: ManagedFolderMetadata | null) {
  metadata.value = nextMetadata;
  originalCaptions.value = Object.fromEntries(
    (nextMetadata?.media ?? []).map((item) => [item.filename, item.caption])
  );
}

async function loadManagedFolders() {
  try {
    managedFolders.value = await fetchManagedFolders();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : tr('Unable to list gallery folders.', 'No se pudieron listar las carpetas.'), true);
  }
}

async function loadMetadata(folderPath: string) {
  if (!folderPath) {
    applyMetadata(null);
    return;
  }
  loadingMetadata.value = true;
  try {
    applyMetadata(await fetchManagedFolderMetadata(folderPath));
  } catch (error) {
    applyMetadata(null);
    showMessage(error instanceof Error ? error.message : tr('Unable to load gallery metadata.', 'No se pudieron cargar los datos de la galería.'), true);
  } finally {
    loadingMetadata.value = false;
  }
}

async function createFolder() {
  creating.value = true;
  try {
    const payload = await createManagedFolder({ ...newFolder });
    selectedFolderPath.value = payload.folder.folderPath;
    applyMetadata(payload.folder);
    await loadManagedFolders();
    newFolder.folderPath = '';
    newFolder.title = '';
    newFolder.description = '';
    showMessage(tr('Gallery created. Upload media, then scan the library.', 'Galería creada. Sube archivos y después escanea la biblioteca.'));
  } catch (error) {
    showMessage(error instanceof Error ? error.message : tr('Unable to create the gallery.', 'No se pudo crear la galería.'), true);
  } finally {
    creating.value = false;
  }
}

async function saveMetadata() {
  if (!metadata.value) return;
  saving.value = true;
  try {
    const payload = await updateManagedFolderMetadata({
      folderPath: metadata.value.folderPath,
      title: metadata.value.title,
      description: metadata.value.description,
      captions: metadata.value.media
        .filter((item) => item.caption !== originalCaptions.value[item.filename])
        .map((item) => ({ filename: item.filename, title: item.caption }))
    });
    applyMetadata(payload.folder);
    await foldersStore.fetchFolders(true);
    showMessage(tr('Gallery text saved to frontmatter.', 'Texto de la galería guardado en el frontmatter.'));
  } catch (error) {
    showMessage(error instanceof Error ? error.message : tr('Unable to save gallery text.', 'No se pudo guardar el texto de la galería.'), true);
  } finally {
    saving.value = false;
  }
}

function selectFiles(event: Event) {
  selectedFiles.value = Array.from((event.target as HTMLInputElement).files ?? []);
}

async function uploadFiles() {
  if (!metadata.value || selectedFiles.value.length === 0) return;
  uploading.value = true;
  try {
    const payload = await uploadManagedMedia(metadata.value.folderPath, selectedFiles.value);
    selectedFiles.value = [];
    fileInputKey.value += 1;
    await loadMetadata(metadata.value.folderPath);
    await loadManagedFolders();
    showMessage(localeStore.isSpanish
      ? `${payload.filenames.length} archivo${payload.filenames.length === 1 ? '' : 's'} subido${payload.filenames.length === 1 ? '' : 's'}. Ejecuta un escaneo para publicarlo${payload.filenames.length === 1 ? '' : 's'}.`
      : `${payload.filenames.length} file${payload.filenames.length === 1 ? '' : 's'} uploaded. Run a scan to publish them.`);
  } catch (error) {
    showMessage(error instanceof Error ? error.message : tr('Unable to upload media.', 'No se pudieron subir los archivos.'), true);
  } finally {
    uploading.value = false;
  }
}

async function runScan() {
  scanning.value = true;
  try {
    const payload = await triggerManualScan();
    await Promise.all([foldersStore.fetchFolders(true), appStore.fetchStats({ background: true })]);
    await loadManagedFolders();
    showMessage(localeStore.isSpanish
      ? 'Escaneo completado. La biblioteca está actualizada.'
      : `Scan ${payload.lastScan?.status ?? 'completed'}. The library is up to date.`);
  } catch (error) {
    showMessage(error instanceof Error ? error.message : tr('Unable to scan the library.', 'No se pudo escanear la biblioteca.'), true);
  } finally {
    scanning.value = false;
  }
}

watch(selectedFolderPath, (folderPath) => {
  void loadMetadata(folderPath);
});

onMounted(() => {
  if (authStore.enabled) {
    void loadManagedFolders();
  }
});
</script>

<style scoped>
.form-control {
  width: 100%;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--surface-alt);
  color: var(--text);
  font: inherit;
}

.form-control:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  box-shadow: 0 0 0 3px var(--accent-soft);
}
</style>
