import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [UnoCSS(), vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4173',
      '/thumbnails': 'http://localhost:4173',
      '/previews': 'http://localhost:4173'
    }
  }
});
