import type express from 'express';

import { authService } from '../services/auth-service.js';

export const ADMIN_REQUIRED_HEADER = 'x-foldergram-admin-required';
export const ADMIN_REQUIRED_MESSAGE = 'Administrator access required.';
export const ADMIN_SETUP_REQUIRED_MESSAGE =
  'Configure an administrator password before using administrator features.';

export function requireAdminAuthentication(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  if (!authService.isEnabled()) {
    response.status(403).json({ message: ADMIN_SETUP_REQUIRED_MESSAGE });
    return;
  }

  if (authService.isAdminRequest(request)) {
    next();
    return;
  }

  response.setHeader(ADMIN_REQUIRED_HEADER, '1');
  response.status(403).json({ message: ADMIN_REQUIRED_MESSAGE });
}

export function requireAdminWhenProtectionEnabled(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  if (!authService.isEnabled()) {
    next();
    return;
  }

  requireAdminAuthentication(request, response, next);
}
