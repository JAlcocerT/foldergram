import { defineStore } from 'pinia';

import { fetchRuntimeConfig } from '../api/gallery';

export type AppLocale = 'en' | 'es';

const STORAGE_KEY = 'foldergram-locale';

function readSavedLocale(): AppLocale | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  return null;
}

function detectBrowserLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en';
  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({ locale: (readSavedLocale() ?? detectBrowserLocale()) as AppLocale }),
  getters: {
    isSpanish: (state) => state.locale === 'es'
  },
  actions: {
    async initialize() {
      const savedLocale = readSavedLocale();

      if (savedLocale) {
        this.locale = savedLocale;
        this.applyDocumentLanguage();
        return;
      }

      try {
        const config = await fetchRuntimeConfig();
        this.locale = config.defaultLocale ?? detectBrowserLocale();
      } catch {
        this.locale = detectBrowserLocale();
      }

      this.applyDocumentLanguage();
    },
    applyDocumentLanguage() {
      if (typeof document !== 'undefined') document.documentElement.lang = this.locale;
    },
    setLocale(locale: AppLocale) {
      this.locale = locale;
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, locale);
      this.applyDocumentLanguage();
    },
    toggleLocale() {
      this.setLocale(this.locale === 'es' ? 'en' : 'es');
    },
    text(english: string, spanish: string) {
      return this.locale === 'es' ? spanish : english;
    }
  }
});
