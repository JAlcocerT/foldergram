import exifr from 'exifr';
import type { TakenAtSource } from '../types/models.js';

const EXIF_DATE_TAGS = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'] as const;

interface ExifDatePayload {
  DateTimeOriginal?: Date | string | number | null;
  DateTimeDigitized?: Date | string | number | null;
  DateTime?: Date | string | number | null;
}

export function normalizeTakenAtValue(value: Date | string | number | null | undefined): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  return null;
}

export async function extractTakenAt(sourcePath: string): Promise<number | null> {
  let metadata: ExifDatePayload | null;

  try {
    metadata = (await exifr.parse(sourcePath, [...EXIF_DATE_TAGS])) as ExifDatePayload | null;
  } catch {
    return null;
  }

  if (!metadata) {
    return null;
  }

  for (const tag of EXIF_DATE_TAGS) {
    const parsed = normalizeTakenAtValue(metadata[tag]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

interface ResolveTakenAtInput {
  exifTakenAt: number | null;
  existingTakenAt: number | null | undefined;
  existingTakenAtSource?: TakenAtSource | null | undefined;
  existingSortTimestamp?: number | null | undefined;
  existingFirstSeenAt?: string | null | undefined;
  existingMtimeMs?: number | null | undefined;
  fileMtimeMs: number;
  firstSeenAt: string;
  stableFallbackTimestamp: number;
}

export interface ResolvedTakenAt {
  takenAt: number;
  source: TakenAtSource;
}

function inferFallbackSource(
  stableFallbackTimestamp: number,
  firstSeenAt: string,
  fileMtimeMs: number
): TakenAtSource {
  const firstSeenTimestamp = Date.parse(firstSeenAt);
  if (Number.isFinite(firstSeenTimestamp) && firstSeenTimestamp === stableFallbackTimestamp) {
    return 'first_seen';
  }

  if (Math.round(fileMtimeMs) === stableFallbackTimestamp) {
    return 'mtime';
  }

  return 'sort_timestamp';
}

export function resolveTakenAt(input: ResolveTakenAtInput): ResolvedTakenAt {
  if (input.exifTakenAt !== null) {
    return {
      takenAt: input.exifTakenAt,
      source: 'exif'
    };
  }

  if (input.existingTakenAt !== null && input.existingTakenAt !== undefined) {
    if (input.existingTakenAtSource) {
      return {
        takenAt: input.existingTakenAt,
        source: input.existingTakenAtSource
      };
    }

    const inferredExistingSource =
      input.existingFirstSeenAt && Date.parse(input.existingFirstSeenAt) === input.existingTakenAt
        ? 'first_seen'
        : input.existingMtimeMs !== null &&
            input.existingMtimeMs !== undefined &&
            Math.round(input.existingMtimeMs) === input.existingTakenAt
          ? 'mtime'
          : input.existingSortTimestamp !== null &&
              input.existingSortTimestamp !== undefined &&
              input.existingSortTimestamp === input.existingTakenAt
            ? inferFallbackSource(input.existingSortTimestamp, input.existingFirstSeenAt ?? input.firstSeenAt, input.existingMtimeMs ?? input.fileMtimeMs)
            : 'sort_timestamp';

    return {
      takenAt: input.existingTakenAt,
      source: inferredExistingSource
    };
  }

  return {
    takenAt: input.stableFallbackTimestamp,
    source: inferFallbackSource(input.stableFallbackTimestamp, input.firstSeenAt, input.fileMtimeMs)
  };
}
