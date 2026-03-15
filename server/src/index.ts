import { createServer } from 'node:http';

import { appConfig } from './config/env.js';
import { createApp } from './app.js';
import { log } from './services/log-service.js';
import { scannerService } from './services/scanner-service.js';
import { watcherService } from './services/watcher-service.js';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = createServer(app);

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      log.error(
        `Port ${appConfig.port} is already in use`,
        'Another server is already listening on that port. Stop it first or change PORT in .env.'
      );
    } else {
      log.error('HTTP server failed to start', error.message);
    }

    process.exitCode = 1;
  });

  server.listen(appConfig.port, () => {
    log.info(`HTTP server listening on http://localhost:${appConfig.port}`);
    const startupAction = scannerService.handleStartup('startup');
    if (startupAction === 'blocked') {
      log.info('Gallery watcher deferred until the library rebuild completes');
      return;
    }

    if (startupAction === 'idle' && appConfig.isDevelopment) {
      log.info('Gallery watcher idle until a user-triggered scan or rebuild starts it');
    }
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
