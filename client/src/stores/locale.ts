import { defineStore } from 'pinia';

export type AppLocale = 'en' | 'es';

const STORAGE_KEY = 'foldergram-locale';

function detectLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({ locale: detectLocale() as AppLocale }),
  getters: {
    isSpanish: (state) => state.locale === 'es'
  },
  actions: {
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
