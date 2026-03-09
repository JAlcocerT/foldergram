import { createServer } from 'node:http';

import { appConfig } from './config/env.js';
import { createApp } from './app.js';
import { log } from './services/log-service.js';
import { scannerService } from './services/scanner-service.js';
import { watcherService } from './services/watcher-service.js';

async function bootstrap(): Promise<void> {
  await scannerService.scanAll('startup');
  await watcherService.start();

  const app = createApp();
  const server = createServer(app);

  server.listen(appConfig.port, () => {
    log.info(`HTTP server listening on http://localhost:${appConfig.port}`);
  });

  async function shutdown(signal: string): Promise<void> {
    log.info(`Received ${signal}, shutting down`);
    await watcherService.stop();
    server.close(() => process.exit(0));
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
