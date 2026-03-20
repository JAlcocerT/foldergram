import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type express from 'express';

import {
  AUTH_PASSWORD_HASH_SETTING_KEY,
  AUTH_PASSWORD_SALT_SETTING_KEY,
  AUTH_SESSION_SECRET_SETTING_KEY,
  AUTH_SESSION_VERSION_SETTING_KEY
} from '../constants/app-setting-keys.js';
import { appSettingsRepository } from '../db/repositories.js';

interface AuthConfigSnapshot {
  enabled: boolean;
  passwordHash: Buffer | null;
  passwordSalt: Buffer | null;
  sessionSecret: Buffer | null;
  sessionVersion: number;
}

interface SessionPayload {
  exp: number;
  sv: number;
}

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
}

export const AUTH_SESSION_COOKIE_NAME = 'foldergram_session';
export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 256;
const PASSWORD_HASH_LENGTH = 64;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function decodeBase64Url(value: string | null): Buffer | null {
  if (!value) {
    return null;
  }

  try {
    const buffer = Buffer.from(value, 'base64url');
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

function parseSessionVersion(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function loadAuthConfig(): AuthConfigSnapshot {
  const passwordHash = decodeBase64Url(appSettingsRepository.get(AUTH_PASSWORD_HASH_SETTING_KEY));
  const passwordSalt = decodeBase64Url(appSettingsRepository.get(AUTH_PASSWORD_SALT_SETTING_KEY));
  const sessionSecret = decodeBase64Url(appSettingsRepository.get(AUTH_SESSION_SECRET_SETTING_KEY));
  const sessionVersion = parseSessionVersion(appSettingsRepository.get(AUTH_SESSION_VERSION_SETTING_KEY));
  const enabled = passwordHash !== null && passwordSalt !== null && sessionSecret !== null && sessionVersion > 0;

  return {
    enabled,
    passwordHash: enabled ? passwordHash : null,
    passwordSalt: enabled ? passwordSalt : null,
    sessionSecret: enabled ? sessionSecret : null,
    sessionVersion: enabled ? sessionVersion : 0
  };
}

function hashPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password.normalize('NFKC'), salt, PASSWORD_HASH_LENGTH);
}

function signValue(value: string, secret: Buffer): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function parseCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const prefix = `${cookieName}=`;

  for (const chunk of cookieHeader.split(';')) {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith(prefix)) {
      continue;
    }

    const rawValue = trimmed.slice(prefix.length);
    if (rawValue.length === 0) {
      return null;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

function parseSessionToken(token: string, secret: Buffer): SessionPayload | null {
  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return null;
  }

  const encodedPayload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = signValue(encodedPayload, secret);

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      typeof payload.sv !== 'number' ||
      !Number.isInteger(payload.sv) ||
      payload.sv <= 0
    ) {
      return null;
    }

    return {
      exp: payload.exp,
      sv: payload.sv
    };
  } catch {
    return null;
  }
}

function isSecureRequest(request: express.Request): boolean {
  if (request.secure) {
    return true;
  }

  const forwardedProto = request.get('x-forwarded-proto');
  if (!forwardedProto) {
    return false;
  }

  const firstValue = forwardedProto
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .find((entry) => entry.length > 0);

  return firstValue === 'https' || firstValue === 'https:';
}

let authConfig = loadAuthConfig();

function createAuthenticatedStatus(): AuthStatus {
  return {
    enabled: authConfig.enabled,
    authenticated: true
  };
}

export const authService = {
  refresh(): void {
    authConfig = loadAuthConfig();
  },

  isEnabled(): boolean {
    return authConfig.enabled;
  },

  getStatus(request: express.Request): AuthStatus {
    if (!authConfig.enabled) {
      return {
        enabled: false,
        authenticated: true
      };
    }

    return {
      enabled: true,
      authenticated: this.isAuthenticatedRequest(request)
    };
  },

  getLoggedOutStatus(): AuthStatus {
    return authConfig.enabled
      ? {
          enabled: true,
          authenticated: false
        }
      : {
          enabled: false,
          authenticated: true
        };
  },

  getAuthenticatedStatus(): AuthStatus {
    return createAuthenticatedStatus();
  },

  isAuthenticatedRequest(request: express.Request): boolean {
    if (!authConfig.enabled || !authConfig.sessionSecret) {
      return true;
    }

    const cookieHeader = request.get('cookie') ?? undefined;
    const token = parseCookieValue(cookieHeader, AUTH_SESSION_COOKIE_NAME);
    if (!token) {
      return false;
    }

    const payload = parseSessionToken(token, authConfig.sessionSecret);
    if (!payload) {
      return false;
    }

    if (payload.exp <= Date.now()) {
      return false;
    }

    return payload.sv === authConfig.sessionVersion;
  },

  verifyPassword(password: string): boolean {
    if (!authConfig.enabled || !authConfig.passwordHash || !authConfig.passwordSalt) {
      return false;
    }

    const expectedHash = hashPassword(password, authConfig.passwordSalt);
    return (
      expectedHash.length === authConfig.passwordHash.length &&
      timingSafeEqual(expectedHash, authConfig.passwordHash)
    );
  },

  setPassword(password: string): AuthStatus {
    const salt = randomBytes(16);
    const sessionSecret = randomBytes(32);
    const passwordHash = hashPassword(password, salt);
    const nextSessionVersion = Math.max(1, authConfig.sessionVersion + 1);

    appSettingsRepository.set(AUTH_PASSWORD_HASH_SETTING_KEY, passwordHash.toString('base64url'));
    appSettingsRepository.set(AUTH_PASSWORD_SALT_SETTING_KEY, salt.toString('base64url'));
    appSettingsRepository.set(AUTH_SESSION_SECRET_SETTING_KEY, sessionSecret.toString('base64url'));
    appSettingsRepository.set(AUTH_SESSION_VERSION_SETTING_KEY, String(nextSessionVersion));

    this.refresh();
    return createAuthenticatedStatus();
  },

  disable(): AuthStatus {
    appSettingsRepository.remove(AUTH_PASSWORD_HASH_SETTING_KEY);
    appSettingsRepository.remove(AUTH_PASSWORD_SALT_SETTING_KEY);
    appSettingsRepository.remove(AUTH_SESSION_SECRET_SETTING_KEY);
    appSettingsRepository.remove(AUTH_SESSION_VERSION_SETTING_KEY);

    this.refresh();
    return {
      enabled: false,
      authenticated: true
    };
  },

  setAuthenticatedSession(response: express.Response, request: express.Request): void {
    if (!authConfig.enabled || !authConfig.sessionSecret) {
      return;
    }

    const payload: SessionPayload = {
      exp: Date.now() + SESSION_DURATION_MS,
      sv: authConfig.sessionVersion
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = signValue(encodedPayload, authConfig.sessionSecret);

    response.cookie(AUTH_SESSION_COOKIE_NAME, `${encodedPayload}.${signature}`, {
      encode: (value) => value,
      httpOnly: true,
      maxAge: SESSION_DURATION_MS,
      path: '/',
      sameSite: 'lax',
      secure: isSecureRequest(request)
    });
  },

  clearAuthenticatedSession(response: express.Response, request: express.Request): void {
    response.cookie(AUTH_SESSION_COOKIE_NAME, '', {
      encode: (value) => value,
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: isSecureRequest(request)
    });
  },

  setNoStoreHeaders(response: express.Response): void {
    response.setHeader('Cache-Control', 'no-store');
  }
};
