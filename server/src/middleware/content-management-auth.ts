import type express from 'express';

import { ADMIN_SETUP_REQUIRED_MESSAGE, requireAdminAuthentication } from './admin-auth.js';

export const CONTENT_MANAGEMENT_AUTH_MESSAGE = ADMIN_SETUP_REQUIRED_MESSAGE;

export function requireContentManagementAuthentication(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  requireAdminAuthentication(request, response, next);
}
