import type { FeedItem, ProfileSummary } from '../types/api';

const DAILY_RECOMMENDATION_COUNT = 5;
const RANKED_POOL_SIZE = 12;
const RECENT_ACTIVITY_WINDOW_MS = 1000 * 60 * 60 * 24 * 45;

interface RankedProfile {
  profile: ProfileSummary;
  score: number;
  likedImageCount: number;
}

export interface HomeRecommendations {
  homeSummaryFolder: ProfileSummary | null;
  recommendedFolders: ProfileSummary[];
}

export function buildLikedCountByProfile(items: FeedItem[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.profileSlug, (counts.get(item.profileSlug) ?? 0) + 1);
  }

  return counts;
}

export function selectHomeRecommendations(
  profiles: ProfileSummary[],
  likedCountByProfile: Map<string, number>,
  lastOpenedProfileSlug: string | null,
  now = new Date()
): HomeRecommendations {
  if (profiles.length === 0) {
    return {
      homeSummaryFolder: null,
      recommendedFolders: []
    };
  }

  const homeSummaryFolder =
    (lastOpenedProfileSlug ? profiles.find((profile) => profile.slug === lastOpenedProfileSlug) ?? null : null) ??
    getFallbackTopProfile(profiles, likedCountByProfile);

  const rankedCandidates = profiles
    .filter((profile) => profile.id !== homeSummaryFolder?.id && profile.imageCount > 0)
    .map((profile) => ({
      profile,
      score: getRecommendationScore(profile, likedCountByProfile, now.getTime()),
      likedImageCount: likedCountByProfile.get(profile.slug) ?? 0
    }))
    .sort(compareRankedProfiles);

  const rankedPool = rankedCandidates.slice(0, Math.min(RANKED_POOL_SIZE, rankedCandidates.length)).map(({ profile }) => profile);
  const recommendedFolders = shuffleWithSeed(rankedPool, createDailySeed(now)).slice(0, DAILY_RECOMMENDATION_COUNT);

  return {
    homeSummaryFolder,
    recommendedFolders
  };
}

function getFallbackTopProfile(profiles: ProfileSummary[], likedCountByProfile: Map<string, number>): ProfileSummary {
  const nonEmptyProfiles = profiles.filter((profile) => profile.imageCount > 0);
  const candidates = nonEmptyProfiles.length > 0 ? nonEmptyProfiles : profiles;

  return [...candidates].sort((left, right) => {
    const recentComparison = compareNumbers(right.latestImageMtimeMs ?? 0, left.latestImageMtimeMs ?? 0);
    if (recentComparison !== 0) {
      return recentComparison;
    }

    const likedComparison = compareNumbers(
      likedCountByProfile.get(right.slug) ?? 0,
      likedCountByProfile.get(left.slug) ?? 0
    );
    if (likedComparison !== 0) {
      return likedComparison;
    }

    const imageCountComparison = compareNumbers(right.imageCount, left.imageCount);
    if (imageCountComparison !== 0) {
      return imageCountComparison;
    }

    return compareText(left.name, right.name);
  })[0];
}

function getRecommendationScore(profile: ProfileSummary, likedCountByProfile: Map<string, number>, nowMs: number): number {
  const recentActivityScore = getRecentActivityScore(profile.latestImageMtimeMs, nowMs);
  const likeScore = normalizeLogarithmicValue(likedCountByProfile.get(profile.slug) ?? 0, 6);
  const imageCountScore = normalizeLogarithmicValue(profile.imageCount, 30);

  return recentActivityScore * 0.6 + likeScore * 0.25 + imageCountScore * 0.15;
}

function getRecentActivityScore(latestImageMtimeMs: number | null, nowMs: number): number {
  if (!latestImageMtimeMs) {
    return 0;
  }

  const ageMs = Math.max(0, nowMs - latestImageMtimeMs);
  return Math.max(0, 1 - ageMs / RECENT_ACTIVITY_WINDOW_MS);
}

function normalizeLogarithmicValue(value: number, cap: number): number {
  if (value <= 0) {
    return 0;
  }

  return Math.min(1, Math.log(value + 1) / Math.log(cap));
}

function compareRankedProfiles(left: RankedProfile, right: RankedProfile): number {
  const scoreComparison = compareNumbers(right.score, left.score);
  if (scoreComparison !== 0) {
    return scoreComparison;
  }

  const likedComparison = compareNumbers(right.likedImageCount, left.likedImageCount);
  if (likedComparison !== 0) {
    return likedComparison;
  }

  const recentComparison = compareNumbers(right.profile.latestImageMtimeMs ?? 0, left.profile.latestImageMtimeMs ?? 0);
  if (recentComparison !== 0) {
    return recentComparison;
  }

  const imageCountComparison = compareNumbers(right.profile.imageCount, left.profile.imageCount);
  if (imageCountComparison !== 0) {
    return imageCountComparison;
  }

  return compareText(left.profile.name, right.profile.name);
}

function compareNumbers(left: number, right: number): number {
  if (left === right) {
    return 0;
  }

  return left > right ? 1 : -1;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function createDailySeed(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const shuffled = [...items];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
