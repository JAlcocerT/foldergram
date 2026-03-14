import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import vue from '@vitejs/plugin-vue';

const appPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appPackage.version)
  },
  plugins: [UnoCSS(), vue()],
  server: {
    host: '0.0.0.0',
    port: 4175,
    proxy: {
      '/api': 'http://localhost:4173',
      '/thumbnails': 'http://localhost:4173',
      '/previews': 'http://localhost:4173'
    }
  }
});
