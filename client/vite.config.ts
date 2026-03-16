import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import UnoCSS from 'unocss/vite';
import vue from '@vitejs/plugin-vue';

const appPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
) as { version: string };
const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(configDirectory, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, '');
  const serverPort = Number.parseInt(env.SERVER_PORT ?? '4141', 10);
  const devClientPort = Number.parseInt(env.DEV_CLIENT_PORT ?? '4142', 10);

  return {
    envDir: repositoryRoot,
    define: {
      __APP_VERSION__: JSON.stringify(appPackage.version)
    },
    plugins: [UnoCSS(), vue()],
    server: {
      host: '0.0.0.0',
      port: devClientPort,
      proxy: {
        '/api': `http://localhost:${serverPort}`,
        '/thumbnails': `http://localhost:${serverPort}`,
        '/previews': `http://localhost:${serverPort}`
      }
    }
  };
});
