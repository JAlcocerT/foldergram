import type express from 'express';

import { authService } from '../services/auth-service.js';

export const CONTENT_MANAGEMENT_AUTH_MESSAGE =
  'Enable password protection in Settings before using content management.';

export function requireContentManagementAuthentication(
  _request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  if (!authService.isEnabled()) {
    response.status(403).json({ message: CONTENT_MANAGEMENT_AUTH_MESSAGE });
    return;
  }

  next();
}
