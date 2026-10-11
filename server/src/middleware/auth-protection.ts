import type express from 'express';

import { authService } from '../services/auth-service.js';

export const AUTH_REQUIRED_MESSAGE = 'Authentication required.';
export const AUTH_REQUIRED_HEADER = 'x-foldergram-auth-required';

export function requireApiAuthentication(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  if (authService.isEnabled() && authService.isAuthenticatedRequest(request)) {
    authService.setNoStoreHeaders(response);
    response.setHeader('Vary', 'Cookie');
  }
  next();
}

export function requireMediaAuthentication(
  _request: express.Request,
  _response: express.Response,
  next: express.NextFunction
): void {
  next();
}
