import { describe, expect, it } from 'vitest';

import { createFingerprint, getDerivativeRelativePath, getStableSortTimestamp } from '../src/utils/image-utils.js';
import { normalizePath } from '../src/utils/path-utils.js';
import { resolveUniqueSlug, slugifyFolderName } from '../src/utils/slug.js';

describe('scanner utilities', () => {
  it('creates stable normalized fingerprints', () => {
    expect(createFingerprint('cats\\sunrise.jpg', 1200, 100.2)).toBe('cats/sunrise.jpg:1200:100');
  });

  it('generates mirrored webp derivative paths', () => {
    expect(getDerivativeRelativePath('folder-one/post-1.jpeg')).toBe('folder-one/post-1.webp');
  });

  it('preserves existing sort timestamps before mtime fallback', () => {
    expect(getStableSortTimestamp({ sortTimestamp: 45, firstSeenAt: '2026-03-01T00:00:00.000Z' }, 900)).toBe(45);
    expect(getStableSortTimestamp({ firstSeenAt: '2026-03-01T00:00:00.000Z' }, 900)).toBe(Date.parse('2026-03-01T00:00:00.000Z'));
    expect(getStableSortTimestamp(null, 900.8)).toBe(901);
  });
});

describe('folder slug resolution', () => {
  it('slugifies folder names safely', () => {
    expect(slugifyFolderName('Summer Trips 2026')).toBe('summer-trips-2026');
    expect(slugifyFolderName('***')).toBe('folder');
  });

  it('resolves duplicate slugs with numeric suffixes', () => {
    const existing = new Set<string>();
    expect(resolveUniqueSlug('Weekend', existing)).toBe('weekend');
    expect(resolveUniqueSlug('Weekend', existing)).toBe('weekend-2');
  });
});

describe('path normalization', () => {
  it('normalizes windows separators for mirrored storage', () => {
    expect(normalizePath('alpha\\beta\\photo.png')).toBe('alpha/beta/photo.png');
  });
});
