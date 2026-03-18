import type express from 'express';

import { appConfig } from '../config/env.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const CSRF_INTENT_HEADER = 'x-foldergram-intent';
export const CSRF_INTENT_VALUE = '1';

function normalizeHostname(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function normalizePort(protocol: string, port: string): string {
  if (port) {
    return port;
  }

  if (protocol === 'https:') {
    return '443';
  }

  if (protocol === 'http:') {
    return '80';
  }

  return '';
}

function parseAuthority(authority: string): { hostname: string; port: string } | null {
  try {
    const parsed = new URL(`http://${authority}`);
    return {
      hostname: normalizeHostname(parsed.hostname),
      port: normalizePort(parsed.protocol, parsed.port)
    };
  } catch {
    return null;
  }
}

function getAllowedPortSet(): Set<string> {
  const allowedPorts = new Set([String(appConfig.port)]);

  if (appConfig.nodeEnv !== 'production') {
    for (const port of appConfig.devClientPorts) {
      allowedPorts.add(String(port));
    }
  }

  return allowedPorts;
}

export function isAllowedLocalOrigin(origin: string, requestHost?: string): boolean {
  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const hostname = normalizeHostname(parsedOrigin.hostname);
  const port = normalizePort(parsedOrigin.protocol, parsedOrigin.port);

  if (appConfig.nodeEnv === 'production') {
    const parsedRequestHost = requestHost ? parseAuthority(requestHost) : null;
    if (!parsedRequestHost) {
      return false;
    }

    return hostname === parsedRequestHost.hostname && port === parsedRequestHost.port;
  }

  if (!LOOPBACK_HOSTS.has(hostname)) {
    return false;
  }

  return getAllowedPortSet().has(port);
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
  const requestHost = request.get('host') ?? undefined;
  if (origin && !isAllowedLocalOrigin(origin, requestHost)) {
    response.status(403).json({ message: 'Forbidden' });
    return;
  }

  const referer = request.get('referer');
  const refererOrigin = referer ? getRefererOrigin(referer) : null;
  if (!origin && refererOrigin && !isAllowedLocalOrigin(refererOrigin, requestHost)) {
    response.status(403).json({ message: 'Forbidden' });
    return;
  }

  next();
}
