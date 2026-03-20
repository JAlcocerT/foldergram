import fs from 'node:fs';
import path from 'node:path';

import express from 'express';

import { appConfig, repositoryRoot } from './config/env.js';
import { requireApiAuthentication, requireMediaAuthentication } from './middleware/auth-protection.js';
import { requireTrustedMutationRequest } from './middleware/csrf-protection.js';
import { blockPublicDemoMutations } from './middleware/public-demo-mode.js';
import { apiRouter } from './routes/api.js';
import { authService } from './services/auth-service.js';

function createProtectedStaticOptions() {
  return {
    fallthrough: false,
    setHeaders(response: { setHeader(name: string, value: string): void }) {
      if (authService.isEnabled()) {
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader('Vary', 'Cookie');
        return;
      }

      response.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  };
}

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/thumbnails', requireMediaAuthentication, express.static(appConfig.thumbnailsDir, createProtectedStaticOptions()));
  app.use('/previews', requireMediaAuthentication, express.static(appConfig.previewsDir, createProtectedStaticOptions()));

  app.use('/api', blockPublicDemoMutations, requireTrustedMutationRequest, requireApiAuthentication, apiRouter);

  if (appConfig.nodeEnv === 'production') {
    const clientDist = path.join(repositoryRoot, 'client', 'dist');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get(/^(?!\/api|\/thumbnails|\/previews).*/, (_request, response) => {
        response.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    response.status(400).json({ message });
  });

  return app;
}
