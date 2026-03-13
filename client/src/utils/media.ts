export function formatMediaDuration(durationMs: number | null | undefined): string {
  if (durationMs === null || durationMs === undefined || durationMs <= 0) {
    return '';
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const INSTAGRAM_MIN_ASPECT_RATIO = 4 / 5;
const INSTAGRAM_MAX_ASPECT_RATIO = 1.91;

export function clampFeedAspectRatio(width: number | null | undefined, height: number | null | undefined): number {
  if (!width || !height || width <= 0 || height <= 0) {
    return 1;
  }

  const ratio = width / height;
  return Math.min(INSTAGRAM_MAX_ASPECT_RATIO, Math.max(INSTAGRAM_MIN_ASPECT_RATIO, ratio));
}
