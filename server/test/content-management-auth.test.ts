import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe.sequential('content management authentication', () => {
  let tempRoot = '';

  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'foldergram-content-auth-'));
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATA_ROOT', path.join(tempRoot, 'data'));
    vi.stubEnv('GALLERY_ROOT', path.join(tempRoot, 'gallery'));
    vi.stubEnv('DB_DIR', path.join(tempRoot, 'db'));
    vi.stubEnv('THUMBNAILS_DIR', path.join(tempRoot, 'thumbnails'));
    vi.stubEnv('PREVIEWS_DIR', path.join(tempRoot, 'previews'));
  });

  beforeEach(() => {
    vi.resetModules();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('requires password protection to be configured', async () => {
    const { requireContentManagementAuthentication, CONTENT_MANAGEMENT_AUTH_MESSAGE } = await import(
      '../src/middleware/content-management-auth.js'
    );
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as unknown as express.Response;
    const next = vi.fn();

    requireContentManagementAuthentication({} as express.Request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: CONTENT_MANAGEMENT_AUTH_MESSAGE });
  });

  it('allows content management after password protection is configured', async () => {
    const { authService } = await import('../src/services/auth-service.js');
    const { requireContentManagementAuthentication } = await import('../src/middleware/content-management-auth.js');
    authService.setPassword('password123');
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as unknown as express.Response;
    const next = vi.fn();

    requireContentManagementAuthentication({} as express.Request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
});
