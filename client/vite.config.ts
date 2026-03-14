import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
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
