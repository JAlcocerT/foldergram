import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type express from 'express';

import {
  AUTH_ADMIN_PASSWORD_HASH_SETTING_KEY,
  AUTH_ADMIN_PASSWORD_SALT_SETTING_KEY,
  AUTH_PASSWORD_HASH_SETTING_KEY,
  AUTH_PASSWORD_SALT_SETTING_KEY,
  AUTH_SESSION_SECRET_SETTING_KEY,
  AUTH_SESSION_VERSION_SETTING_KEY
} from '../constants/app-setting-keys.js';
import { appSettingsRepository } from '../db/repositories.js';

interface AuthConfigSnapshot {
  enabled: boolean;
  adminEnabled: boolean;
  passwordHash: Buffer | null;
  passwordSalt: Buffer | null;
  adminPasswordHash: Buffer | null;
  adminPasswordSalt: Buffer | null;
  sessionSecret: Buffer | null;
  sessionVersion: number;
}

interface SessionPayload {
  exp: number;
  sv: number;
  role: AuthRole;
}

export type AuthRole = 'viewer' | 'admin';

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
  adminEnabled: boolean;
  role: AuthRole | null;
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
  const adminPasswordHash = decodeBase64Url(appSettingsRepository.get(AUTH_ADMIN_PASSWORD_HASH_SETTING_KEY));
  const adminPasswordSalt = decodeBase64Url(appSettingsRepository.get(AUTH_ADMIN_PASSWORD_SALT_SETTING_KEY));
  const adminEnabled = enabled && adminPasswordHash !== null && adminPasswordSalt !== null;

  return {
    enabled,
    adminEnabled,
    passwordHash: enabled ? passwordHash : null,
    passwordSalt: enabled ? passwordSalt : null,
    adminPasswordHash: adminEnabled ? adminPasswordHash : null,
    adminPasswordSalt: adminEnabled ? adminPasswordSalt : null,
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

    const role: AuthRole = payload.role === 'viewer' ? 'viewer' : 'admin';
    return {
      exp: payload.exp,
      sv: payload.sv,
      role
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

function createAuthenticatedStatus(role: AuthRole): AuthStatus {
  return {
    enabled: authConfig.enabled,
    authenticated: true,
    adminEnabled: authConfig.adminEnabled,
    role
  };
}

function getSessionPayload(request: express.Request): SessionPayload | null {
  if (!authConfig.enabled || !authConfig.sessionSecret) {
    return null;
  }

  const cookieHeader = request.get('cookie') ?? undefined;
  const token = parseCookieValue(cookieHeader, AUTH_SESSION_COOKIE_NAME);
  if (!token) {
    return null;
  }

  const payload = parseSessionToken(token, authConfig.sessionSecret);
  if (!payload || payload.exp <= Date.now() || payload.sv !== authConfig.sessionVersion) {
    return null;
  }

  return payload;
}

export const authService = {
  refresh(): void {
    authConfig = loadAuthConfig();
  },

  isEnabled(): boolean {
    return authConfig.enabled;
  },

  isAdminEnabled(): boolean {
    return authConfig.adminEnabled;
  },

  getStatus(request: express.Request): AuthStatus {
    if (!authConfig.enabled) {
      return {
        enabled: false,
        authenticated: true,
        adminEnabled: false,
        role: 'admin'
      };
    }

    const payload = getSessionPayload(request);
    return {
      enabled: true,
      authenticated: payload !== null,
      adminEnabled: authConfig.adminEnabled,
      role: payload ? (authConfig.adminEnabled ? payload.role : 'admin') : null
    };
  },

  getLoggedOutStatus(): AuthStatus {
    return authConfig.enabled
      ? {
          enabled: true,
          authenticated: false,
          adminEnabled: authConfig.adminEnabled,
          role: null
        }
      : {
          enabled: false,
          authenticated: true,
          adminEnabled: false,
          role: 'admin'
        };
  },

  getAuthenticatedStatus(role: AuthRole): AuthStatus {
    return createAuthenticatedStatus(authConfig.adminEnabled ? role : 'admin');
  },

  isAuthenticatedRequest(request: express.Request): boolean {
    if (!authConfig.enabled) {
      return true;
    }
    return getSessionPayload(request) !== null;
  },

  isAdminRequest(request: express.Request): boolean {
    if (!authConfig.enabled) {
      return false;
    }
    const payload = getSessionPayload(request);
    return payload !== null && (!authConfig.adminEnabled || payload.role === 'admin');
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

  verifyAdminPassword(password: string): boolean {
    if (!authConfig.adminEnabled || !authConfig.adminPasswordHash || !authConfig.adminPasswordSalt) {
      return false;
    }

    const expectedHash = hashPassword(password, authConfig.adminPasswordSalt);
    return (
      expectedHash.length === authConfig.adminPasswordHash.length &&
      timingSafeEqual(expectedHash, authConfig.adminPasswordHash)
    );
  },

  setPassword(password: string): AuthStatus {
    if (this.verifyAdminPassword(password)) {
      throw new Error('Viewer and administrator passwords must be different.');
    }
    const salt = randomBytes(16);
    const sessionSecret = randomBytes(32);
    const passwordHash = hashPassword(password, salt);
    const nextSessionVersion = Math.max(1, authConfig.sessionVersion + 1);

    appSettingsRepository.set(AUTH_PASSWORD_HASH_SETTING_KEY, passwordHash.toString('base64url'));
    appSettingsRepository.set(AUTH_PASSWORD_SALT_SETTING_KEY, salt.toString('base64url'));
    appSettingsRepository.set(AUTH_SESSION_SECRET_SETTING_KEY, sessionSecret.toString('base64url'));
    appSettingsRepository.set(AUTH_SESSION_VERSION_SETTING_KEY, String(nextSessionVersion));

    this.refresh();
    return createAuthenticatedStatus('admin');
  },

  setAdminPassword(password: string): AuthStatus {
    if (!authConfig.enabled) {
      throw new Error('Enable viewer password protection before configuring an administrator password.');
    }
    if (this.verifyPassword(password)) {
      throw new Error('Administrator and viewer passwords must be different.');
    }

    const salt = randomBytes(16);
    const passwordHash = hashPassword(password, salt);
    const nextSessionVersion = Math.max(1, authConfig.sessionVersion + 1);
    appSettingsRepository.set(AUTH_ADMIN_PASSWORD_HASH_SETTING_KEY, passwordHash.toString('base64url'));
    appSettingsRepository.set(AUTH_ADMIN_PASSWORD_SALT_SETTING_KEY, salt.toString('base64url'));
    appSettingsRepository.set(AUTH_SESSION_VERSION_SETTING_KEY, String(nextSessionVersion));
    this.refresh();
    return createAuthenticatedStatus('admin');
  },

  disable(): AuthStatus {
    appSettingsRepository.remove(AUTH_PASSWORD_HASH_SETTING_KEY);
    appSettingsRepository.remove(AUTH_PASSWORD_SALT_SETTING_KEY);
    appSettingsRepository.remove(AUTH_SESSION_SECRET_SETTING_KEY);
    appSettingsRepository.remove(AUTH_SESSION_VERSION_SETTING_KEY);
    appSettingsRepository.remove(AUTH_ADMIN_PASSWORD_HASH_SETTING_KEY);
    appSettingsRepository.remove(AUTH_ADMIN_PASSWORD_SALT_SETTING_KEY);

    this.refresh();
    return {
      enabled: false,
      authenticated: true,
      adminEnabled: false,
      role: 'admin'
    };
  },

  setAuthenticatedSession(response: express.Response, request: express.Request, role: AuthRole = 'admin'): void {
    if (!authConfig.enabled || !authConfig.sessionSecret) {
      return;
    }

    const payload: SessionPayload = {
      exp: Date.now() + SESSION_DURATION_MS,
      sv: authConfig.sessionVersion,
      role: authConfig.adminEnabled ? role : 'admin'
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
