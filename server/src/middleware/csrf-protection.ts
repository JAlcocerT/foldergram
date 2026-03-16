import type express from 'express';

import { appConfig } from '../config/env.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const CSRF_INTENT_HEADER = 'x-foldergram-intent';
export const CSRF_INTENT_VALUE = '1';

function normalizeHostname(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function getAllowedPortSet(): Set<string> {
  return new Set([String(appConfig.port), String(appConfig.devClientPort)]);
}

export function isAllowedLocalOrigin(origin: string): boolean {
  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const hostname = normalizeHostname(parsedOrigin.hostname);
  if (!LOOPBACK_HOSTS.has(hostname)) {
    return false;
  }

  return getAllowedPortSet().has(parsedOrigin.port);
}

function getRefererOrigin(referer: string): string | null {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function requireTrustedMutationRequest(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    next();
    return;
  }

  if (request.get(CSRF_INTENT_HEADER) !== CSRF_INTENT_VALUE) {
    response.status(403).json({ message: 'Forbidden' });
    return;
  }

  const origin = request.get('origin');
  if (origin && !isAllowedLocalOrigin(origin)) {
    response.status(403).json({ message: 'Forbidden' });
    return;
  }

  const referer = request.get('referer');
  const refererOrigin = referer ? getRefererOrigin(referer) : null;
  if (!origin && refererOrigin && !isAllowedLocalOrigin(refererOrigin)) {
    response.status(403).json({ message: 'Forbidden' });
    return;
  }

  next();
}
