import { describe, expect, it } from 'vitest';

import {
  buildLikedCountByFolder,
  selectHomeRecommendations
} from '../../client/src/utils/home-recommendations.js';

const baseFolders = [
  {
    id: 1,
    slug: 'alpha',
    name: 'Alpha',
    folderPath: 'gallery/alpha',
    imageCount: 12,
    latestImageMtimeMs: Date.parse('2026-03-01T09:00:00.000Z'),
    avatarUrl: null
  },
  {
    id: 2,
    slug: 'beta',
    name: 'Beta',
    folderPath: 'gallery/beta',
    imageCount: 7,
    latestImageMtimeMs: Date.parse('2026-03-10T09:00:00.000Z'),
    avatarUrl: null
  },
  {
    id: 3,
    slug: 'gamma',
    name: 'Gamma',
    folderPath: 'gallery/gamma',
    imageCount: 23,
    latestImageMtimeMs: Date.parse('2026-02-26T09:00:00.000Z'),
    avatarUrl: null
  },
  {
    id: 4,
    slug: 'delta',
    name: 'Delta',
    folderPath: 'gallery/delta',
    imageCount: 0,
    latestImageMtimeMs: null,
    avatarUrl: null
  },
  {
    id: 5,
    slug: 'epsilon',
    name: 'Epsilon',
    folderPath: 'gallery/epsilon',
    imageCount: 18,
    latestImageMtimeMs: Date.parse('2026-02-20T09:00:00.000Z'),
    avatarUrl: null
  },
  {
    id: 6,
    slug: 'zeta',
    name: 'Zeta',
    folderPath: 'gallery/zeta',
    imageCount: 5,
    latestImageMtimeMs: Date.parse('2026-03-08T09:00:00.000Z'),
    avatarUrl: null
  },
  {
    id: 7,
    slug: 'eta',
    name: 'Eta',
    folderPath: 'gallery/eta',
    imageCount: 14,
    latestImageMtimeMs: Date.parse('2026-02-28T09:00:00.000Z'),
    avatarUrl: null
  }
];

const likedCountByFolder = buildLikedCountByFolder([
  { id: 101, folderId: 1, folderSlug: 'alpha', folderName: 'Alpha', filename: '1.jpg', width: 1, height: 1, thumbnailUrl: '', previewUrl: '', sortTimestamp: 1 },
  { id: 102, folderId: 1, folderSlug: 'alpha', folderName: 'Alpha', filename: '2.jpg', width: 1, height: 1, thumbnailUrl: '', previewUrl: '', sortTimestamp: 2 },
  { id: 103, folderId: 5, folderSlug: 'epsilon', folderName: 'Epsilon', filename: '3.jpg', width: 1, height: 1, thumbnailUrl: '', previewUrl: '', sortTimestamp: 3 },
  { id: 104, folderId: 6, folderSlug: 'zeta', folderName: 'Zeta', filename: '4.jpg', width: 1, height: 1, thumbnailUrl: '', previewUrl: '', sortTimestamp: 4 }
]);

describe('home recommendations', () => {
  it('keeps the last opened folder in the top slot when it is still present', () => {
    const recommendations = selectHomeRecommendations(
      baseFolders,
      likedCountByFolder,
      'alpha',
      new Date('2026-03-12T12:00:00.000Z')
    );

    expect(recommendations.homeSummaryFolder?.slug).toBe('alpha');
  });

  it('falls back to the most recently active non-empty folder', () => {
    const recommendations = selectHomeRecommendations(
      baseFolders,
      likedCountByFolder,
      null,
      new Date('2026-03-12T12:00:00.000Z')
    );

    expect(recommendations.homeSummaryFolder?.slug).toBe('beta');
  });

  it('builds a stable daily suggestion list from ranked non-empty folders', () => {
    const first = selectHomeRecommendations(
      baseFolders,
      likedCountByFolder,
      null,
      new Date('2026-03-12T12:00:00.000Z')
    );
    const second = selectHomeRecommendations(
      baseFolders,
      likedCountByFolder,
      null,
      new Date('2026-03-12T18:30:00.000Z')
    );

    expect(first.recommendedFolders.map((folder) => folder.slug)).toEqual(
      second.recommendedFolders.map((folder) => folder.slug)
    );
    expect(first.recommendedFolders).toHaveLength(5);
    expect(first.recommendedFolders.map((folder) => folder.slug)).not.toContain('beta');
    expect(first.recommendedFolders.map((folder) => folder.slug)).not.toContain('delta');
  });
});
