import type express from 'express';

import { describe, expect, it, vi } from 'vitest';

import { appConfig } from '../src/config/env.js';
import {
  CSRF_INTENT_HEADER,
  CSRF_INTENT_VALUE,
  isAllowedLocalOrigin,
  requireTrustedMutationRequest
} from '../src/middleware/csrf-protection.js';

function createRequest(method: string, headers: Record<string, string | undefined> = {}): express.Request {
  const normalizedHeaders = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));

  return {
    method,
    get(name: string) {
      return normalizedHeaders.get(name.toLowerCase());
    }
  } as unknown as express.Request;
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as express.Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe('isAllowedLocalOrigin', () => {
  it('allows loopback origins for the app and dev-client ports', () => {
    expect(isAllowedLocalOrigin(`http://localhost:${appConfig.port}`)).toBe(true);
    expect(isAllowedLocalOrigin(`http://127.0.0.1:${appConfig.devClientPort}`)).toBe(true);
    expect(isAllowedLocalOrigin(`http://[::1]:${appConfig.port}`)).toBe(true);
  });

  it('rejects non-loopback or unexpected ports', () => {
    expect(isAllowedLocalOrigin('http://example.com:4141')).toBe(false);
    expect(isAllowedLocalOrigin('http://localhost:9999')).toBe(false);
    expect(isAllowedLocalOrigin('not-a-url')).toBe(false);
  });
});

describe('requireTrustedMutationRequest', () => {
  it('allows safe methods without the CSRF header', () => {
    const request = createRequest('GET');
    const response = createResponse();
    const next = vi.fn();

    requireTrustedMutationRequest(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('blocks mutating requests without the intent header', () => {
    const request = createRequest('POST');
    const response = createResponse();
    const next = vi.fn();

    requireTrustedMutationRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it('allows mutating requests with the intent header and an allowed origin', () => {
    const request = createRequest('DELETE', {
      [CSRF_INTENT_HEADER]: CSRF_INTENT_VALUE,
      origin: `http://localhost:${appConfig.devClientPort}`
    });
    const response = createResponse();
    const next = vi.fn();

    requireTrustedMutationRequest(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('allows mutating requests with the intent header and no browser origin metadata', () => {
    const request = createRequest('POST', {
      [CSRF_INTENT_HEADER]: CSRF_INTENT_VALUE
    });
    const response = createResponse();
    const next = vi.fn();

    requireTrustedMutationRequest(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('blocks mutating requests when the origin is not trusted', () => {
    const request = createRequest('POST', {
      [CSRF_INTENT_HEADER]: CSRF_INTENT_VALUE,
      origin: 'http://evil.example:4142'
    });
    const response = createResponse();
    const next = vi.fn();

    requireTrustedMutationRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it('blocks mutating requests when only an untrusted referer is present', () => {
    const request = createRequest('POST', {
      [CSRF_INTENT_HEADER]: CSRF_INTENT_VALUE,
      referer: 'http://evil.example:4142/path'
    });
    const response = createResponse();
    const next = vi.fn();

    requireTrustedMutationRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });
});
