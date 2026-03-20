import { defineStore } from 'pinia';

import {
  changePasswordProtection,
  disablePasswordProtection,
  enablePasswordProtection,
  fetchAuthStatus,
  loginWithPassword,
  logout
} from '../api/gallery';
import type { AuthStatus } from '../types/api';

interface AuthState {
  ready: boolean;
  loading: boolean;
  enabled: boolean;
  authenticated: boolean;
  error: string | null;
}

async function clearAppCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  const cacheKeys = await window.caches.keys();
  await Promise.all(cacheKeys.filter((key) => key.startsWith('foldergram-')).map((key) => window.caches.delete(key)));
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    ready: false,
    loading: false,
    enabled: false,
    authenticated: true,
    error: null
  }),
  getters: {
    accessGranted: (state) => !state.enabled || state.authenticated,
    requiresLogin: (state) => state.enabled && !state.authenticated
  },
  actions: {
    applyStatus(status: AuthStatus) {
      this.enabled = status.enabled;
      this.authenticated = status.authenticated;
      this.ready = true;
    },

    clearError() {
      this.error = null;
    },

    handleUnauthorized(message = 'Your session ended. Log in again.') {
      if (!this.enabled) {
        return;
      }

      this.ready = true;
      this.loading = false;
      this.authenticated = false;
      this.error = message;
    },

    async initialize(force = false) {
      if (this.loading) {
        return;
      }

      if (this.ready && !force) {
        return;
      }

      this.loading = true;

      try {
        const status = await fetchAuthStatus();
        this.applyStatus(status);
        this.error = null;
      } catch (error) {
        this.ready = true;
        this.error = error instanceof Error ? error.message : 'Unable to load access protection status.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async login(password: string) {
      this.loading = true;

      try {
        const payload = await loginWithPassword(password);
        this.applyStatus(payload.auth);
        this.error = null;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to sign in.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;

      try {
        const payload = await logout();
        this.applyStatus(payload.auth);
        this.error = null;
        await clearAppCaches();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to sign out.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async enablePassword(password: string) {
      this.loading = true;

      try {
        const payload = await enablePasswordProtection(password);
        this.applyStatus(payload.auth);
        this.error = null;
        await clearAppCaches();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to enable password protection.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async changePassword(currentPassword: string, password: string) {
      this.loading = true;

      try {
        const payload = await changePasswordProtection(currentPassword, password);
        this.applyStatus(payload.auth);
        this.error = null;
        await clearAppCaches();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to change the password.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async disablePassword(currentPassword: string) {
      this.loading = true;

      try {
        const payload = await disablePasswordProtection(currentPassword);
        this.applyStatus(payload.auth);
        this.error = null;
        await clearAppCaches();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unable to disable password protection.';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
