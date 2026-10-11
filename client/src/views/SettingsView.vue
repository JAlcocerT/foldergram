<template>
  <section class="w-[min(100%,72rem)] mx-auto flex flex-col gap-[1.2rem]">
    <header class="flex items-end justify-between gap-4 pb-[0.8rem] max-sm:flex-col max-sm:items-start">
      <div>
        <span class="eyebrow">{{ tr('Settings', 'Configuración') }}</span>
        <h1 class="mt-[0.15rem] mb-0 text-[clamp(1.55rem,2.4vw,2rem)] font-medium tracking-[-0.04em]">{{ tr('Library Controls', 'Controles de la biblioteca') }}</h1>
        <p class="m-0 text-muted">{{ tr('Run scans, refresh thumbnails, or reset the library index.', 'Escanea, actualiza miniaturas o restablece el índice de la biblioteca.') }}</p>
      </div>
    </header>

    <section v-if="!authStore.adminEnabled" class="card grid gap-[1.15rem] p-8" style="background: radial-gradient(circle at top right, rgba(24,119,242,0.14), transparent 42%), linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, #f3f8ff 4%) 0%, var(--surface) 100%);">
      <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <span class="eyebrow text-accent-strong">{{ tr('Access Protection', 'Protección de acceso') }}</span>
          <h2 class="m-0 mt-[0.2rem] text-[1.18rem]">{{ tr('Administrator password', 'Contraseña de administración') }}</h2>
          <p class="m-0 mt-[0.35rem] text-muted">{{ tr('The gallery is public. This password protects content and library management.', 'La galería es pública. Esta contraseña protege la gestión del contenido y la biblioteca.') }}</p>
        </div>
        <span
          class="inline-flex items-center justify-center min-h-8 px-[0.7rem] py-[0.35rem] rounded-full text-[0.76rem] font-bold whitespace-nowrap"
          :class="authStore.enabled ? 'text-accent-strong bg-[color-mix(in_srgb,var(--accent-soft)_78%,transparent_22%)]' : 'text-muted bg-surface-alt'"
        >
          {{ authStore.enabled ? tr('Enabled', 'Activada') : tr('Disabled', 'Desactivada') }}
        </span>
      </div>

      <p class="m-0 text-muted">
        {{ authProtectionDescription }}
      </p>

      <div v-if="authFeedbackMessage" class="rounded-[0.95rem] px-4 py-3 text-[0.9rem]" :class="authFeedbackTone === 'error' ? 'border border-[rgba(214,48,49,0.24)] text-[#c0392b] bg-[rgba(214,48,49,0.08)]' : 'border border-[rgba(24,119,242,0.2)] text-accent-strong bg-[rgba(24,119,242,0.08)]'">
        {{ authFeedbackMessage }}
      </div>

      <section v-if="!authStore.enabled" class="grid gap-[1rem]">
        <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label class="grid gap-[0.45rem]">
            <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('New password', 'Nueva contraseña') }}</span>
            <input
              v-model="enablePassword"
              class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
              type="password"
              autocomplete="new-password"
              placeholder="Minimum 8 characters"
              :disabled="authStore.loading"
            />
          </label>
          <label class="grid gap-[0.45rem]">
            <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('Confirm password', 'Confirmar contraseña') }}</span>
            <input
              v-model="enablePasswordConfirmation"
              class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
              type="password"
              autocomplete="new-password"
              placeholder="Repeat the password"
              :disabled="authStore.loading"
            />
          </label>
        </div>

        <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
          <button class="btn-primary min-w-[13rem]" type="button" :disabled="authStore.loading" @click="enableAccessProtection">
            {{ authStore.loading ? tr('Enabling...', 'Activando...') : tr('Enable Password Protection', 'Activar protección') }}
          </button>
          <p class="m-0 text-muted">{{ tr('The password is stored as a one-way hash and unlocks this browser with a signed session cookie.', 'La contraseña se guarda de forma segura y desbloquea este navegador mediante una sesión firmada.') }}</p>
        </div>
      </section>

      <section v-else class="grid gap-[1rem]">
        <div class="grid gap-[0.9rem] rounded-[1.05rem] border border-[color-mix(in_srgb,var(--border)_78%,var(--accent)_22%)] p-5">
          <div>
            <h3 class="m-0 text-[1rem]">{{ tr('Change administrator password', 'Cambiar contraseña de administración') }}</h3>
            <p class="m-0 mt-[0.25rem] text-muted">{{ tr('Update administrator access and invalidate older sessions.', 'Actualiza el acceso de administración y cierra las sesiones anteriores.') }}</p>
          </div>

          <div class="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
            <label class="grid gap-[0.45rem]">
              <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('Current password', 'Contraseña actual') }}</span>
              <input
                v-model="currentPassword"
                class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
                type="password"
                autocomplete="current-password"
                :disabled="authStore.loading"
              />
            </label>
            <label class="grid gap-[0.45rem]">
              <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('New password', 'Nueva contraseña') }}</span>
              <input
                v-model="nextPassword"
                class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
                type="password"
                autocomplete="new-password"
                :disabled="authStore.loading"
              />
            </label>
            <label class="grid gap-[0.45rem]">
              <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('Confirm new password', 'Confirmar nueva contraseña') }}</span>
              <input
                v-model="nextPasswordConfirmation"
                class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
                type="password"
                autocomplete="new-password"
                :disabled="authStore.loading"
              />
            </label>
          </div>

          <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
            <button class="btn-primary min-w-[11.5rem]" type="button" :disabled="authStore.loading" @click="changeAccessPassword">
              {{ authStore.loading ? tr('Updating...', 'Actualizando...') : tr('Change Password', 'Cambiar contraseña') }}
            </button>
            <p class="m-0 text-muted">{{ tr('Use at least 8 characters. Changing the password signs out any older sessions.', 'Usa al menos 8 caracteres. El cambio cerrará las sesiones anteriores.') }}</p>
          </div>
        </div>

        <div class="grid gap-[0.9rem] rounded-[1.05rem] border border-[rgba(214,48,49,0.16)] p-5">
          <div>
            <h3 class="m-0 text-[1rem]">{{ tr('Disable protection', 'Desactivar protección') }}</h3>
            <p class="m-0 mt-[0.25rem] text-muted">Turn the shared password back off for this Foldergram instance.</p>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 items-end max-lg:grid-cols-1">
            <label class="grid gap-[0.45rem]">
              <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">Current password</span>
              <input
                v-model="disablePassword"
                class="h-12 rounded-[0.95rem] border border-border bg-[color-mix(in_srgb,var(--surface-alt)_84%,transparent_16%)] px-4 text-[0.95rem] text-text outline-none transition-[border-color,box-shadow] duration-180 focus:border-[color-mix(in_srgb,var(--accent)_48%,var(--border)_52%)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-soft)_76%,transparent_24%)]"
                type="password"
                autocomplete="current-password"
                :disabled="authStore.loading"
              />
            </label>
            <button class="btn-primary min-w-[10.5rem] bg-[#d93025] hover:bg-[#c5281c]" type="button" :disabled="authStore.loading" @click="disableAccessProtection">
              {{ authStore.loading ? tr('Disabling...', 'Desactivando...') : tr('Disable Protection', 'Desactivar protección') }}
            </button>
            <button class="inline-flex min-h-12 items-center justify-center rounded-[0.95rem] border border-border bg-transparent px-4 text-[0.92rem] font-semibold text-text transition-colors duration-180 hover:bg-surface-alt disabled:cursor-wait disabled:opacity-60" type="button" :disabled="authStore.loading" @click="signOut">
              {{ tr('Sign Out', 'Cerrar sesión') }}
            </button>
          </div>
        </div>
      </section>
    </section>

    <section v-if="authStore.enabled" class="card grid gap-[1rem] p-8">
      <div>
        <span class="eyebrow text-accent-strong">{{ tr('Administrator Access', 'Acceso de administración') }}</span>
        <h2 class="m-0 mt-1 text-[1.18rem]">{{ authStore.adminEnabled ? tr('Change admin password', 'Cambiar contraseña de administración') : tr('Create admin password', 'Crear contraseña de administración') }}</h2>
        <p class="m-0 mt-1 text-muted">{{ tr('The admin password unlocks uploads, metadata editing, scans, settings, Trash, and deletion. Visitors need no password.', 'La contraseña permite subir archivos, editar textos, escanear, configurar y eliminar. Los visitantes no necesitan contraseña.') }}</p>
      </div>
      <div class="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        <label v-if="authStore.adminEnabled" class="grid gap-2">
          <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('Current admin password', 'Contraseña actual') }}</span>
          <input v-model="currentAdminPassword" class="h-12 rounded-[0.95rem] border border-border bg-surface-alt px-4 text-text" type="password" autocomplete="current-password" />
        </label>
        <label class="grid gap-2">
          <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('New admin password', 'Nueva contraseña') }}</span>
          <input v-model="nextAdminPassword" class="h-12 rounded-[0.95rem] border border-border bg-surface-alt px-4 text-text" type="password" autocomplete="new-password" />
        </label>
        <label class="grid gap-2">
          <span class="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-muted">{{ tr('Confirm admin password', 'Confirmar contraseña') }}</span>
          <input v-model="nextAdminPasswordConfirmation" class="h-12 rounded-[0.95rem] border border-border bg-surface-alt px-4 text-text" type="password" autocomplete="new-password" />
        </label>
      </div>
      <button class="btn-primary w-fit min-w-[12rem]" type="button" :disabled="authStore.loading" @click="saveAdminPassword">
        {{ authStore.loading ? tr('Saving...', 'Guardando...') : authStore.adminEnabled ? tr('Change Admin Password', 'Cambiar contraseña') : tr('Create Admin Password', 'Crear contraseña') }}
      </button>
    </section>

    <section
      v-if="showScanErrorNotice"
      class="card grid gap-[1rem] p-8 border-[color-mix(in_srgb,#d2a133_45%,var(--border)_55%)]"
      style="background: radial-gradient(circle at top right, rgba(210,161,51,0.18), transparent 42%), linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, #fff4d1 8%) 0%, color-mix(in srgb, var(--surface) 86%, #ffeab1 14%) 100%);"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="grid gap-[0.35rem]">
          <span class="eyebrow text-[#9f6a00]">{{ tr('Scan Needs Attention', 'El escaneo necesita atención') }}</span>
          <h2 class="m-0 text-[1.1rem]">{{ tr('The last scan completed with errors', 'El último escaneo terminó con errores') }}</h2>
          <p class="m-0 text-muted">{{ scanErrorNoticeMessage }}</p>
        </div>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[rgba(159,106,0,0.08)] text-[#9f6a00] cursor-pointer transition-colors duration-180 hover:bg-[rgba(159,106,0,0.14)]"
          type="button"
          aria-label="Dismiss scan warning"
          @click="dismissScanErrorNotice"
        >
          <span class="i-fluent-dismiss-20-filled h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
        <button class="btn-primary min-w-[11.5rem]" type="button" :disabled="scanActionDisabled" @click="runManualScan">
          {{ scanButtonLabel }}
        </button>
        <p class="m-0 text-muted">{{ tr('Run a new library scan to retry failed media and fill in any missing thumbnails or previews.', 'Ejecuta otro escaneo para reintentar los archivos fallidos y generar las miniaturas que falten.') }}</p>
      </div>
    </section>

    <section
      v-if="showIgnoredRootMediaNotice"
      class="card flex items-center justify-between gap-3 px-4 py-3 border-[color-mix(in_srgb,var(--border)_82%,#d2a133_18%)]"
      style="background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 97%, #fff9ea 3%) 0%, color-mix(in srgb, var(--surface) 94%, #fff3d8 6%) 100%);"
    >
      <p class="m-0 min-w-0 flex-1 break-words text-[0.8rem] leading-[1.45] text-muted">
        {{ ignoredRootMediaNoticeMessage }}
      </p>
      <button
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-[rgba(159,106,0,0.08)] text-[#9f6a00] cursor-pointer transition-colors duration-180 hover:bg-[rgba(159,106,0,0.14)]"
        type="button"
        aria-label="Dismiss gallery root warning"
        @click="dismissIgnoredRootMediaNotice"
      >
        <span class="i-fluent-dismiss-20-filled h-5 w-5" aria-hidden="true" />
      </button>
    </section>

    <section class="grid grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.95fr)] gap-6 items-start max-md:grid-cols-1">
      <!-- Left: Scan controls -->
      <div class="flex flex-col gap-[1.15rem]">
        <section class="card grid gap-[1.15rem] p-8" style="background: radial-gradient(circle at top right, rgba(0,149,246,0.15), transparent 40%), linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 90%, var(--accent) 10%) 100%);">
          <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">{{ tr('Scan Library', 'Escanear biblioteca') }}</h2>
              <p class="m-0 text-muted">{{ tr('Run a scan after adding folders or when you want to refresh indexed media.', 'Escanea después de añadir carpetas o para actualizar los archivos indexados.') }}</p>
            </div>
            <span
              class="inline-flex items-center justify-center min-h-8 px-[0.7rem] py-[0.35rem] rounded-full text-[0.76rem] font-bold whitespace-nowrap"
              :class="{
                'text-muted bg-surface-alt': statusTone === 'idle',
                'text-accent-strong bg-[color-mix(in_srgb,var(--accent-soft)_78%,transparent_22%)]': statusTone === 'active',
                'text-[#b76e00] bg-[rgba(242,164,30,0.14)]': statusTone === 'warning',
                'text-[#c0392b] bg-[rgba(214,48,49,0.12)]': statusTone === 'danger',
              }"
            >{{ statusLabel }}</span>
          </div>

          <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
            <button
              class="btn-primary min-w-[11.5rem]"
              type="button"
              :disabled="scanActionDisabled"
              @click="runManualScan"
            >
              {{ scanButtonLabel }}
            </button>
            <p class="m-0 text-muted">{{ scanActionNote }}</p>
          </div>

          <p v-if="scanError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ scanError }}</p>
        </section>

        <section
          class="card grid gap-[1rem] p-8"
          :class="highlightRebuildAction ? 'ring-2 ring-[color-mix(in_srgb,var(--accent)_45%,transparent_55%)]' : ''"
          :style="rebuildCardStyle"
        >
          <div class="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">{{ tr('Rebuild Library', 'Reconstruir biblioteca') }}</h2>
              <p class="m-0 text-muted">{{ tr('Refresh thumbnails or reset the library index from the current gallery root.', 'Actualiza las miniaturas o restablece el índice desde la carpeta actual.') }}</p>
            </div>
            <span
              class="inline-flex items-center justify-center min-h-8 px-[0.7rem] py-[0.35rem] rounded-full text-[0.76rem] font-bold whitespace-nowrap"
              :class="appStore.isLibraryRebuildRequired ? 'text-[#9f6a00] bg-[rgba(210,161,51,0.14)]' : 'text-muted bg-surface-alt'"
            >
              {{ appStore.isLibraryRebuildRequired ? tr('Recommended', 'Recomendado') : tr('Optional', 'Opcional') }}
            </span>
          </div>

          <dl class="grid gap-[0.8rem] m-0">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 92%, var(--accent) 8%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Current gallery root', 'Carpeta actual de la galería') }}</dt>
              <dd class="m-0 text-[0.92rem] font-semibold break-all">{{ appStore.stats?.libraryIndex.currentGalleryRoot ?? tr('Unavailable', 'No disponible') }}</dd>
            </div>
            <div v-if="appStore.stats?.libraryIndex.previousGalleryRoot" class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 92%, #d2a133 8%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Previous gallery root', 'Carpeta anterior de la galería') }}</dt>
              <dd class="m-0 text-[0.92rem] font-semibold break-all">{{ appStore.stats.libraryIndex.previousGalleryRoot }}</dd>
            </div>
          </dl>

          <div class="grid gap-[1rem]">
            <section class="grid gap-[0.7rem]">
              <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
                <button class="btn-primary min-w-[13rem]" type="button" :disabled="thumbnailRebuildActionDisabled" @click="confirmThumbnailRebuildOpen = true">
                  {{ thumbnailRebuildButtonLabel }}
                </button>
                <p class="m-0 text-muted">
                  {{ tr('Rebuild feed and profile thumbnails plus video posters from indexed media only.', 'Regenera las miniaturas y carátulas de vídeo usando solo los archivos indexados.') }}
                </p>
              </div>
              <p class="m-0 text-muted">{{ thumbnailRebuildActionNote }}</p>
              <p v-if="thumbnailRebuildError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ thumbnailRebuildError }}</p>
            </section>

            <section class="grid gap-[0.7rem]">
              <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-start">
                <button class="btn-primary min-w-[13rem]" type="button" :disabled="rebuildActionDisabled" @click="confirmRebuildOpen = true">
                  {{ rebuildButtonLabel }}
                </button>
                <p class="m-0 text-muted">
                  {{ tr('Reset the library index, reuse matching cached media, and generate only missing derivatives from the current gallery root.', 'Restablece el índice, reutiliza los archivos en caché y genera solo los elementos que falten.') }}
                </p>
              </div>
              <p class="m-0 text-muted">{{ rebuildActionNote }}</p>
              <p v-if="rebuildError" class="m-0 px-4 py-[0.85rem] border border-[rgba(214,48,49,0.24)] rounded-[0.9rem] text-[#c0392b] bg-[rgba(214,48,49,0.08)]">{{ rebuildError }}</p>
            </section>
          </div>
        </section>
      </div>

      <!-- Right: Status cards -->
      <aside class="flex flex-col gap-[1.15rem]">
        <section class="card grid gap-[1.15rem] p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">{{ tr('Library Status', 'Estado de la biblioteca') }}</h2>
              <p class="m-0 text-muted">{{ tr('Current storage and index state.', 'Estado actual del almacenamiento y del índice.') }}</p>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-[0.8rem] m-0">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Storage', 'Almacenamiento') }}</dt>
              <dd class="m-0 text-base font-bold">{{ storageLabel }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Folders', 'Carpetas') }}</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.folders ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Indexed posts', 'Publicaciones indexadas') }}</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.indexedImages ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Indexed videos', 'Vídeos indexados') }}</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(appStore.stats?.indexedVideos ?? 0) }}</dd>
            </div>
          </dl>
        </section>

        <section class="card grid gap-[1.15rem] p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="m-0 mb-[0.18rem] text-[1.1rem]">{{ tr('Last Scan', 'Último escaneo') }}</h2>
              <p class="m-0 text-muted">{{ tr('Most recent completed run tracked by the app.', 'Último escaneo completado registrado por la aplicación.') }}</p>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-[0.8rem] m-0">
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Status', 'Estado') }}</dt>
              <dd class="m-0 text-base font-bold">{{ lastScanStatus }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Finished', 'Finalizado') }}</dt>
              <dd class="m-0 text-base font-bold">{{ lastScanFinishedAt }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Files scanned', 'Archivos escaneados') }}</dt>
              <dd class="m-0 text-base font-bold">{{ formatCount(lastCompletedScan?.scanned_files ?? 0) }}</dd>
            </div>
            <div class="px-4 py-[0.9rem] rounded-[0.9rem]" style="background: color-mix(in srgb, var(--surface-alt) 90%, var(--accent) 10%)">
              <dt class="m-0 mb-[0.25rem] text-muted text-[0.72rem] font-bold tracking-[0.08em] uppercase">{{ tr('Changes', 'Cambios') }}</dt>
              <dd class="m-0 text-base font-bold whitespace-pre-line">{{ lastScanChangeSummary }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </section>

    <ConfirmDialog
      v-if="confirmRebuildOpen"
      :title="tr('Rebuild the current library index?', '¿Reconstruir el índice de la biblioteca?')"
      :message="tr('This will clear the indexed database tables and rescan the active gallery. Original files will not be deleted.', 'Se borrará el índice y se volverá a escanear la galería activa. Los archivos originales no se eliminarán.')"
      :confirm-label="tr('Rebuild Library Index', 'Reconstruir índice')"
      :loading-label="tr('Rebuilding...', 'Reconstruyendo...')"
      :loading="rebuilding"
      @cancel="confirmRebuildOpen = false"
      @confirm="runLibraryRebuild"
    />
    <ConfirmDialog
      v-if="confirmThumbnailRebuildOpen"
      :title="tr('Regenerate thumbnails only?', '¿Regenerar solo las miniaturas?')"
      :message="tr('This will rebuild generated thumbnails from the indexed library. Original files will not be deleted.', 'Se regenerarán las miniaturas desde la biblioteca indexada. Los archivos originales no se eliminarán.')"
      :confirm-label="tr('Regenerate Thumbnails', 'Regenerar miniaturas')"
      :loading-label="tr('Regenerating...', 'Regenerando...')"
      :loading="rebuildingThumbnails"
      @cancel="confirmThumbnailRebuildOpen = false"
      @confirm="runThumbnailRebuild"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import ConfirmDialog from '../components/ConfirmDialog.vue';
import { triggerLibraryRebuild, triggerManualScan, triggerThumbnailRebuild } from '../api/gallery';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';
import { useFoldersStore } from '../stores/folders';
import { useLikesStore } from '../stores/likes';
import { useLocaleStore } from '../stores/locale';
import { useMomentsStore } from '../stores/moments';
import { useViewerStore } from '../stores/viewer';

const appStore = useAppStore();
const authStore = useAuthStore();
const feedStore = useFeedStore();
const foldersStore = useFoldersStore();
const likesStore = useLikesStore();
const localeStore = useLocaleStore();
const tr = (english: string, spanish: string) => localeStore.text(english, spanish);
const momentsStore = useMomentsStore();
const viewerStore = useViewerStore();
const route = useRoute();
const scanError = ref<string | null>(null);
const rebuildError = ref<string | null>(null);
const thumbnailRebuildError = ref<string | null>(null);
const requestingScan = ref(false);
const rebuilding = ref(false);
const rebuildingThumbnails = ref(false);
const confirmRebuildOpen = ref(false);
const confirmThumbnailRebuildOpen = ref(false);
const authFeedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null);
const enablePassword = ref('');
const enablePasswordConfirmation = ref('');
const currentPassword = ref('');
const nextPassword = ref('');
const nextPasswordConfirmation = ref('');
const disablePassword = ref('');
const currentAdminPassword = ref('');
const nextAdminPassword = ref('');
const nextAdminPasswordConfirmation = ref('');
const SCAN_ERROR_NOTICE_STORAGE_KEY = 'foldergram-scan-error-notice-dismissal';
const IGNORED_ROOT_MEDIA_NOTICE_STORAGE_KEY = 'foldergram-ignored-root-media-notice-dismissal';
const NOTICE_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function loadDismissedScanErrorNotice(): { scanId: number; dismissedUntil: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(SCAN_ERROR_NOTICE_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { scanId?: unknown; dismissedUntil?: unknown };
    if (
      typeof parsed.scanId !== 'number' ||
      !Number.isFinite(parsed.scanId) ||
      typeof parsed.dismissedUntil !== 'number' ||
      !Number.isFinite(parsed.dismissedUntil)
    ) {
      return null;
    }

    return {
      scanId: parsed.scanId,
      dismissedUntil: parsed.dismissedUntil
    };
  } catch {
    return null;
  }
}

const dismissedScanErrorNotice = ref(loadDismissedScanErrorNotice());
const dismissedIgnoredRootMediaNotice = ref(loadDismissedIgnoredRootMediaNotice());

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function clearAuthFeedback() {
  authFeedback.value = null;
  authStore.clearError();
}

function setAuthError(message: string) {
  authFeedback.value = {
    tone: 'error',
    message
  };
}

function setAuthSuccess(message: string) {
  authFeedback.value = {
    tone: 'success',
    message
  };
}

function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return tr(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  if (password.trim().length === 0) {
    return tr('Password cannot be empty.', 'La contraseña no puede estar vacía.');
  }

  if (password !== confirmation) {
    return tr('The password confirmation does not match.', 'La confirmación de la contraseña no coincide.');
  }

  return null;
}

const scan = computed(() => appStore.stats?.scan ?? null);
const lastCompletedScan = computed(() => scan.value?.lastCompletedScan ?? appStore.stats?.lastScan ?? null);
const activeScanReason = computed(() => scan.value?.scanReason ?? null);
const isLibraryRebuildActive = computed(
  () => rebuilding.value || (appStore.isScanning && activeScanReason.value === 'rebuild')
);
const isThumbnailRebuildActive = computed(
  () => rebuildingThumbnails.value || (appStore.isScanning && activeScanReason.value === 'rebuild-thumbnails')
);
const isRebuildOperationActive = computed(() => isLibraryRebuildActive.value || isThumbnailRebuildActive.value);
const scanProgressActive = computed(() => requestingScan.value || Boolean(scan.value?.isScanning && !isRebuildOperationActive.value));
const highlightRebuildAction = computed(() => route.query.action === 'rebuild');
const waitingForInitialStatus = computed(() => !appStore.stats || appStore.loadingStats);
const scanActionDisabled = computed(
  () =>
    waitingForInitialStatus.value ||
    appStore.isLibraryUnavailable ||
    appStore.isLibraryRebuildRequired ||
    appStore.isScanning ||
    requestingScan.value ||
    rebuilding.value ||
    rebuildingThumbnails.value
);
const rebuildActionDisabled = computed(
  () =>
    waitingForInitialStatus.value ||
    appStore.isLibraryUnavailable ||
    appStore.isScanning ||
    requestingScan.value ||
    rebuilding.value ||
    rebuildingThumbnails.value
);
const thumbnailRebuildActionDisabled = computed(
  () =>
    waitingForInitialStatus.value ||
    appStore.isLibraryUnavailable ||
    appStore.isLibraryRebuildRequired ||
    appStore.isScanning ||
    requestingScan.value ||
    rebuilding.value ||
    rebuildingThumbnails.value
);
const rebuildCardStyle = computed(() =>
  appStore.isLibraryRebuildRequired
    ? 'background: radial-gradient(circle at top right, rgba(210,161,51,0.2), transparent 42%), linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 88%, #fff3c3 12%) 100%);'
    : 'background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, var(--accent) 4%) 0%, var(--surface) 100%);'
);
const statusTone = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return 'danger';
  }

  if (scanProgressActive.value || isRebuildOperationActive.value) {
    return 'active';
  }

  if (lastCompletedScan.value?.status === 'completed_with_errors') {
    return 'warning';
  }

  return 'idle';
});
const statusLabel = computed(() => {
  if (appStore.isLibraryUnavailable) {
    return tr('Storage unavailable', 'Almacenamiento no disponible');
  }

  if (scanProgressActive.value) {
    return tr('Scan in progress', 'Escaneo en curso');
  }

  if (isRebuildOperationActive.value) {
    return tr('Rebuild active', 'Reconstrucción en curso');
  }

  return tr('Ready', 'Listo');
});
const scanButtonLabel = computed(() => {
  if (scanProgressActive.value) {
    return tr('Scanning library...', 'Escaneando biblioteca...');
  }

  return tr('Run Scan Library', 'Escanear biblioteca');
});
const scanActionNote = computed(() => {
  if (waitingForInitialStatus.value) {
    return tr('Loading current library status...', 'Cargando el estado de la biblioteca...');
  }

  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (appStore.isLibraryRebuildRequired) {
    return tr('Rebuild the library index first because the gallery location changed.', 'Reconstruye primero el índice porque cambió la ubicación de la galería.');
  }

  if (isRebuildOperationActive.value) {
    return 'Another library task is running. Live progress appears in the sticky status bar.';
  }

  if (scanProgressActive.value) {
    return 'Live progress appears in the sticky status bar.';
  }

  return tr('Scans check for added, updated, or missing media.', 'El escaneo busca archivos añadidos, modificados o ausentes.');
});
const rebuildButtonLabel = computed(() => {
  if (isLibraryRebuildActive.value) {
    return tr('Rebuilding now...', 'Reconstruyendo...');
  }

  return tr('Rebuild Library Index', 'Reconstruir índice');
});
const thumbnailRebuildButtonLabel = computed(() => {
  if (isThumbnailRebuildActive.value) {
    return tr('Regenerating now...', 'Regenerando...');
  }

  return tr('Regenerate Thumbnails', 'Regenerar miniaturas');
});
const rebuildActionNote = computed(() => {
  if (waitingForInitialStatus.value) {
    return 'Loading current library status...';
  }

  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (isLibraryRebuildActive.value) {
    return 'Live progress appears in the sticky status bar.';
  }

  if (isThumbnailRebuildActive.value) {
    return 'Wait for thumbnail regeneration to finish first.';
  }

  if (appStore.isScanning) {
    return 'Wait for the current scan to finish first.';
  }

  if (appStore.isLibraryRebuildRequired) {
    return 'Recommended because the gallery location changed.';
  }

  return 'Use this to reset the index and reuse any existing derivatives at the current storage paths.';
});
const thumbnailRebuildActionNote = computed(() => {
  if (waitingForInitialStatus.value) {
    return 'Loading current library status...';
  }

  if (appStore.isLibraryUnavailable) {
    return appStore.libraryUnavailableReason;
  }

  if (appStore.isLibraryRebuildRequired) {
    return 'Unavailable until the library index is rebuilt for the new gallery location.';
  }

  if (isThumbnailRebuildActive.value) {
    return 'Live progress appears in the sticky status bar.';
  }

  if (isLibraryRebuildActive.value) {
    return 'Wait for the full rebuild to finish first.';
  }

  if (appStore.isScanning) {
    return 'Wait for the current scan to finish first.';
  }

  return 'Use this for a faster thumbnail-only refresh.';
});
const authProtectionDescription = computed(() =>
  authStore.enabled
    ? 'Administrator protection is active. Public visitors can still browse the gallery without signing in.'
    : 'The gallery is public and administrator actions are disabled until you configure a password.'
);
const authFeedbackMessage = computed(() => authFeedback.value?.message ?? authStore.error);
const authFeedbackTone = computed(() => authFeedback.value?.tone ?? 'error');
const storageLabel = computed(() => (appStore.isLibraryUnavailable ? tr('Unavailable', 'No disponible') : tr('Available', 'Disponible')));
const lastScanStatus = computed(() => {
  if (!lastCompletedScan.value) {
    return tr('No completed scans yet', 'Todavía no hay escaneos completados');
  }

  return lastCompletedScan.value.status.replaceAll('_', ' ');
});
const lastScanFinishedAt = computed(() => formatDateTime(lastCompletedScan.value?.finished_at));
const lastScanChangeSummary = computed(() => {
  if (!lastCompletedScan.value) {
    return '0 new\n0 updated\n0 removed';
  }

  return `${lastCompletedScan.value.new_files} new\n${lastCompletedScan.value.updated_files} updated\n${lastCompletedScan.value.removed_files} removed`;
});
const showScanErrorNotice = computed(() => {
  if (appStore.isLibraryUnavailable || appStore.isScanning) {
    return false;
  }

  if (lastCompletedScan.value?.status !== 'completed_with_errors') {
    return false;
  }

  const dismissed = dismissedScanErrorNotice.value;
  if (!dismissed) {
    return true;
  }

  if (dismissed.scanId !== lastCompletedScan.value.id) {
    return true;
  }

  return Date.now() >= dismissed.dismissedUntil;
});
const ignoredRootMediaCount = computed(() => appStore.stats?.libraryIndex.ignoredRootMediaCount ?? 0);
const showIgnoredRootMediaNotice = computed(() => {
  if (appStore.isLibraryUnavailable || (appStore.stats?.folders ?? 0) === 0 || ignoredRootMediaCount.value === 0) {
    return false;
  }

  const dismissed = dismissedIgnoredRootMediaNotice.value;
  if (!dismissed) {
    return true;
  }

  const currentGalleryRoot = appStore.stats?.libraryIndex.currentGalleryRoot ?? '';
  if (dismissed.galleryRoot !== currentGalleryRoot) {
    return true;
  }

  if (dismissed.ignoredRootMediaCount !== ignoredRootMediaCount.value) {
    return true;
  }

  return Date.now() >= dismissed.dismissedUntil;
});
const scanErrorNoticeMessage = computed(() => {
  return 'Some media failed during the last run. Scan the library again to retry any missed files and derivative generation.';
});
const ignoredRootMediaNoticeMessage = computed(() => {
  const supportedFileLabel = ignoredRootMediaCount.value === 1 ? 'supported file is' : 'supported files are';
  return `${formatCount(ignoredRootMediaCount.value)} ${supportedFileLabel} being ignored in the gallery root. Move them into a folder inside your gallery root to create App Folders. Files placed directly in the gallery root are ignored.`;
});

function dismissScanErrorNotice() {
  const scanId = lastCompletedScan.value?.id;
  if (!scanId) {
    return;
  }

  const nextDismissal = {
    scanId,
    dismissedUntil: Date.now() + NOTICE_DISMISS_MS
  };

  dismissedScanErrorNotice.value = nextDismissal;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SCAN_ERROR_NOTICE_STORAGE_KEY, JSON.stringify(nextDismissal));
  }
}

function loadDismissedIgnoredRootMediaNotice(): { galleryRoot: string; ignoredRootMediaCount: number; dismissedUntil: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(IGNORED_ROOT_MEDIA_NOTICE_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      galleryRoot?: unknown;
      ignoredRootMediaCount?: unknown;
      dismissedUntil?: unknown;
    };
    if (
      typeof parsed.galleryRoot !== 'string' ||
      typeof parsed.ignoredRootMediaCount !== 'number' ||
      !Number.isFinite(parsed.ignoredRootMediaCount) ||
      typeof parsed.dismissedUntil !== 'number' ||
      !Number.isFinite(parsed.dismissedUntil)
    ) {
      return null;
    }

    return {
      galleryRoot: parsed.galleryRoot,
      ignoredRootMediaCount: parsed.ignoredRootMediaCount,
      dismissedUntil: parsed.dismissedUntil
    };
  } catch {
    return null;
  }
}

function dismissIgnoredRootMediaNotice() {
  const currentGalleryRoot = appStore.stats?.libraryIndex.currentGalleryRoot;
  if (!currentGalleryRoot || ignoredRootMediaCount.value === 0) {
    return;
  }

  const nextDismissal = {
    galleryRoot: currentGalleryRoot,
    ignoredRootMediaCount: ignoredRootMediaCount.value,
    dismissedUntil: Date.now() + NOTICE_DISMISS_MS
  };

  dismissedIgnoredRootMediaNotice.value = nextDismissal;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(IGNORED_ROOT_MEDIA_NOTICE_STORAGE_KEY, JSON.stringify(nextDismissal));
  }
}

async function enableAccessProtection() {
  if (authStore.loading) {
    return;
  }

  clearAuthFeedback();
  const validationError = validatePasswordConfirmation(enablePassword.value, enablePasswordConfirmation.value);
  if (validationError) {
    setAuthError(validationError);
    return;
  }

  try {
    await authStore.enablePassword(enablePassword.value);
    enablePassword.value = '';
    enablePasswordConfirmation.value = '';
    setAuthSuccess(tr('Password protection is now enabled for this Foldergram instance.', 'La protección de administración está activada.'));
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : 'Unable to enable password protection.');
  }
}

async function changeAccessPassword() {
  if (authStore.loading) {
    return;
  }

  clearAuthFeedback();
  if (currentPassword.value.length === 0) {
    setAuthError(tr('Enter the current password to change it.', 'Introduce la contraseña actual para cambiarla.'));
    return;
  }

  const validationError = validatePasswordConfirmation(nextPassword.value, nextPasswordConfirmation.value);
  if (validationError) {
    setAuthError(validationError);
    return;
  }

  try {
    await authStore.changePassword(currentPassword.value, nextPassword.value);
    currentPassword.value = '';
    nextPassword.value = '';
    nextPasswordConfirmation.value = '';
    setAuthSuccess(tr('The administrator password was updated and existing sessions were invalidated.', 'La contraseña de administración se actualizó y se cerraron las sesiones anteriores.'));
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : 'Unable to change the password.');
  }
}

async function disableAccessProtection() {
  if (authStore.loading) {
    return;
  }

  clearAuthFeedback();
  if (disablePassword.value.length === 0) {
    setAuthError(tr('Enter the current password to disable protection.', 'Introduce la contraseña actual para desactivar la protección.'));
    return;
  }

  try {
    await authStore.disablePassword(disablePassword.value);
    disablePassword.value = '';
    currentPassword.value = '';
    nextPassword.value = '';
    nextPasswordConfirmation.value = '';
    setAuthSuccess(tr('Password protection has been disabled.', 'La protección se ha desactivado.'));
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : 'Unable to disable password protection.');
  }
}

async function saveAdminPassword() {
  clearAuthFeedback();
  if (authStore.adminEnabled && currentAdminPassword.value.length === 0) {
    setAuthError(tr('Enter the current administrator password.', 'Introduce la contraseña actual de administración.'));
    return;
  }
  const validationError = validatePasswordConfirmation(nextAdminPassword.value, nextAdminPasswordConfirmation.value);
  if (validationError) {
    setAuthError(validationError);
    return;
  }
  try {
    await authStore.changeAdminPassword(nextAdminPassword.value, authStore.adminEnabled ? currentAdminPassword.value : undefined);
    currentAdminPassword.value = '';
    nextAdminPassword.value = '';
    nextAdminPasswordConfirmation.value = '';
    setAuthSuccess(tr('The administrator password was saved.', 'La contraseña de administración se ha guardado.'));
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : 'Unable to save the administrator password.');
  }
}

async function signOut() {
  if (authStore.loading) {
    return;
  }

  clearAuthFeedback();

  try {
    await authStore.logout();
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
  }
}

async function warmScanStatus() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await wait(attempt === 0 ? 150 : 250);

    try {
      await appStore.fetchStats({ background: true });
    } catch {
      // The rescan request may win the race; keep polling until scan state flips or the request finishes.
    }

    if (appStore.stats?.scan.isScanning) {
      return;
    }
  }
}

async function runManualScan() {
  if (scanActionDisabled.value) {
    return;
  }

  requestingScan.value = true;
  scanError.value = null;

  try {
    const request = triggerManualScan();
    void warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([foldersStore.fetchFolders(true), feedStore.loadInitial(true)]);
  } catch (error) {
    scanError.value = error instanceof Error ? error.message : 'Unable to start a library scan.';
  } finally {
    requestingScan.value = false;
  }
}

async function runLibraryRebuild() {
  if (rebuildActionDisabled.value) {
    return;
  }

  rebuilding.value = true;
  rebuildError.value = null;
  confirmRebuildOpen.value = false;
  appStore.markLibraryRebuildStarted();
  feedStore.resetForRebuild();
  foldersStore.resetForRebuild();
  likesStore.resetForRebuild();
  momentsStore.resetForRebuild();
  viewerStore.reset();

  try {
    const request = triggerLibraryRebuild();
    void warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([
      foldersStore.fetchFolders(true),
      feedStore.loadInitial(true),
      likesStore.initialize(true),
      momentsStore.fetchMoments(true)
    ]);
  } catch (error) {
    rebuildError.value = error instanceof Error ? error.message : 'Unable to rebuild the current library index.';
    await appStore.fetchStats({ background: true });
  } finally {
    rebuilding.value = false;
  }
}

async function runThumbnailRebuild() {
  if (thumbnailRebuildActionDisabled.value) {
    return;
  }

  rebuildingThumbnails.value = true;
  thumbnailRebuildError.value = null;
  confirmThumbnailRebuildOpen.value = false;

  try {
    const request = triggerThumbnailRebuild();
    void warmScanStatus();
    await request;
    await appStore.fetchStats({ background: true });
    await Promise.all([
      foldersStore.fetchFolders(true),
      feedStore.loadInitial(true),
      likesStore.initialize(true),
      momentsStore.fetchMoments(true)
    ]);
  } catch (error) {
    thumbnailRebuildError.value = error instanceof Error ? error.message : 'Unable to regenerate thumbnails.';
    await appStore.fetchStats({ background: true });
  } finally {
    rebuildingThumbnails.value = false;
  }
}

onMounted(async () => {
  if (!appStore.stats && !appStore.loadingStats) {
    await appStore.fetchStats();
  }
});
</script>
