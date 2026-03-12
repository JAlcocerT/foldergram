import { describe, expect, it } from 'vitest';

import { normalizeTakenAtValue, resolveTakenAt } from '../src/utils/exif-utils.js';

describe('EXIF timestamp helpers', () => {
  it('normalizes Date, ISO string, and numeric values', () => {
    expect(normalizeTakenAtValue(new Date('2024-03-14T09:26:53Z'))).toBe(Date.parse('2024-03-14T09:26:53Z'));
    expect(normalizeTakenAtValue('2024-03-14T09:26:53Z')).toBe(Date.parse('2024-03-14T09:26:53Z'));
    expect(normalizeTakenAtValue(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(normalizeTakenAtValue('not-a-date')).toBeNull();
  });

  it('prefers EXIF capture time and tracks source provenance', () => {
    expect(
      resolveTakenAt({
        exifTakenAt: 3600,
        existingTakenAt: 1200,
        existingTakenAtSource: 'mtime',
        existingSortTimestamp: 1200,
        existingFirstSeenAt: '2024-03-10T00:00:00.000Z',
        existingMtimeMs: 1200,
        fileMtimeMs: 1200,
        firstSeenAt: '2024-03-10T00:00:00.000Z',
        stableFallbackTimestamp: 2400
      })
    ).toEqual({
      takenAt: 3600,
      source: 'exif'
    });
  });

  it('preserves or infers stable fallback provenance when EXIF is missing', () => {
    expect(
      resolveTakenAt({
        exifTakenAt: null,
        existingTakenAt: 1200,
        existingTakenAtSource: 'mtime',
        existingSortTimestamp: 1200,
        existingFirstSeenAt: '2024-03-10T00:00:00.000Z',
        existingMtimeMs: 1200,
        fileMtimeMs: 1200,
        firstSeenAt: '2024-03-10T00:00:00.000Z',
        stableFallbackTimestamp: 2400
      })
    ).toEqual({
      takenAt: 1200,
      source: 'mtime'
    });

    expect(
      resolveTakenAt({
        exifTakenAt: null,
        existingTakenAt: null,
        existingTakenAtSource: null,
        existingSortTimestamp: null,
        existingFirstSeenAt: null,
        existingMtimeMs: null,
        fileMtimeMs: 2400,
        firstSeenAt: '2024-03-10T00:00:00.000Z',
        stableFallbackTimestamp: 2400
      })
    ).toEqual({
      takenAt: 2400,
      source: 'mtime'
    });

    expect(
      resolveTakenAt({
        exifTakenAt: null,
        existingTakenAt: 1_710_028_800_000,
        existingTakenAtSource: null,
        existingSortTimestamp: 1_710_028_800_000,
        existingFirstSeenAt: '2024-03-10T00:00:00.000Z',
        existingMtimeMs: 5000,
        fileMtimeMs: 5000,
        firstSeenAt: '2024-03-10T00:00:00.000Z',
        stableFallbackTimestamp: 1_710_028_800_000
      })
    ).toEqual({
      takenAt: 1_710_028_800_000,
      source: 'first_seen'
    });
  });
});
