import { databaseManager } from './database.js';
import { normalizePath } from '../utils/path-utils.js';
import type { AppSettingRecord, FeedImage, FolderScanStateRecord, ImageDetail, ImageRecord, LikeRecord, ProfileRecord, ScanRunRecord } from '../types/models.js';

const database = databaseManager.connection;

function nowIso(): string {
  return new Date().toISOString();
}

export interface UpsertProfileInput {
  slug: string;
  name: string;
  folderPath: string;
}

export interface SaveProfileResult {
  profile: ProfileRecord;
  wrote: boolean;
}

export interface UpsertImageInput {
  profileId: number;
  filename: string;
  extension: string;
  relativePath: string;
  absolutePath: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  fingerprint: string;
  mtimeMs: number;
  firstSeenAt: string;
  sortTimestamp: number;
  thumbnailPath: string;
  previewPath: string;
}

export interface RefreshIndexedImageInput {
  profileId: number;
  filename: string;
  extension: string;
  relativePath: string;
  absolutePath: string;
  fileSize: number;
  mimeType: string;
  fingerprint: string;
  mtimeMs: number;
  thumbnailPath: string;
  previewPath: string;
}

export interface UpsertFolderScanStateInput {
  folderPath: string;
  signature: string;
  fileCount: number;
  maxMtimeMs: number;
  totalSize: number;
}

export const profileRepository = {
  getAll(): ProfileRecord[] {
    return database.prepare('SELECT * FROM profiles ORDER BY name COLLATE NOCASE ASC').all() as unknown as ProfileRecord[];
  },

  getBySlug(slug: string): ProfileRecord | undefined {
    return database.prepare('SELECT * FROM profiles WHERE slug = ?').get(slug) as ProfileRecord | undefined;
  },

  upsert(input: UpsertProfileInput): ProfileRecord {
    database.prepare(
      `
      INSERT INTO profiles (slug, name, folder_path, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        folder_path = excluded.folder_path,
        updated_at = excluded.updated_at
      `
    ).run(input.slug, input.name, input.folderPath, nowIso());

    return this.getBySlug(input.slug) as ProfileRecord;
  },

  save(input: UpsertProfileInput): SaveProfileResult {
    const existing = this.getBySlug(input.slug);
    if (existing && existing.name === input.name && normalizePath(existing.folder_path) === normalizePath(input.folderPath)) {
      return {
        profile: existing,
        wrote: false
      };
    }

    return {
      profile: this.upsert(input),
      wrote: true
    };
  },

  count(): number {
    return Number((database.prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number }).count);
  },

  setAvatar(profileId: number, imageId: number | null): void {
    database.prepare('UPDATE profiles SET avatar_image_id = ?, updated_at = ? WHERE id = ? AND avatar_image_id IS NOT ?').run(
      imageId,
      nowIso(),
      profileId,
      imageId
    );
  }
};

export const imageRepository = {
  getByRelativePath(relativePath: string): ImageRecord | undefined {
    return database.prepare('SELECT * FROM images WHERE relative_path = ?').get(relativePath) as ImageRecord | undefined;
  },

  getById(id: number): ImageRecord | undefined {
    return database.prepare('SELECT * FROM images WHERE id = ?').get(id) as ImageRecord | undefined;
  },

  upsert(input: UpsertImageInput): ImageRecord {
    database.prepare(
      `
      INSERT INTO images (
        profile_id, filename, extension, relative_path, absolute_path, file_size, width, height,
        mime_type, checksum_or_fingerprint, mtime_ms, first_seen_at, sort_timestamp,
        thumbnail_path, preview_path, is_deleted, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(relative_path) DO UPDATE SET
        profile_id = excluded.profile_id,
        filename = excluded.filename,
        extension = excluded.extension,
        absolute_path = excluded.absolute_path,
        file_size = excluded.file_size,
        width = excluded.width,
        height = excluded.height,
        mime_type = excluded.mime_type,
        checksum_or_fingerprint = excluded.checksum_or_fingerprint,
        mtime_ms = excluded.mtime_ms,
        thumbnail_path = excluded.thumbnail_path,
        preview_path = excluded.preview_path,
        is_deleted = 0,
        updated_at = excluded.updated_at
      `
    ).run(
      input.profileId,
      input.filename,
      input.extension,
      input.relativePath,
      input.absolutePath,
      input.fileSize,
      input.width,
      input.height,
      input.mimeType,
      input.fingerprint,
      input.mtimeMs,
      input.firstSeenAt,
      input.sortTimestamp,
      input.thumbnailPath,
      input.previewPath,
      nowIso()
    );

    return this.getByRelativePath(input.relativePath) as ImageRecord;
  },

  refreshIndexed(input: RefreshIndexedImageInput): ImageRecord {
    database.prepare(
      `
      UPDATE images
      SET
        profile_id = ?,
        filename = ?,
        extension = ?,
        absolute_path = ?,
        file_size = ?,
        mime_type = ?,
        checksum_or_fingerprint = ?,
        mtime_ms = ?,
        thumbnail_path = ?,
        preview_path = ?,
        is_deleted = 0,
        updated_at = ?
      WHERE relative_path = ?
      `
    ).run(
      input.profileId,
      input.filename,
      input.extension,
      input.absolutePath,
      input.fileSize,
      input.mimeType,
      input.fingerprint,
      input.mtimeMs,
      input.thumbnailPath,
      input.previewPath,
      nowIso(),
      input.relativePath
    );

    return this.getByRelativePath(input.relativePath) as ImageRecord;
  },

  markDeleted(relativePath: string): void {
    database.prepare('UPDATE images SET is_deleted = 1, updated_at = ? WHERE relative_path = ?').run(nowIso(), relativePath);
  },

  markProfileImagesDeleted(profileId: number, activeRelativePaths: string[]): number {
    const rows = database.prepare('SELECT relative_path FROM images WHERE profile_id = ? AND is_deleted = 0').all(profileId) as Array<{ relative_path: string }>;
    const active = new Set(activeRelativePaths);
    let removedCount = 0;

    for (const row of rows) {
      if (!active.has(row.relative_path)) {
        this.markDeleted(row.relative_path);
        removedCount += 1;
      }
    }

    return removedCount;
  },

  markAllDeletedByProfile(profileId: number): number {
    const result = database.prepare('UPDATE images SET is_deleted = 1, updated_at = ? WHERE profile_id = ? AND is_deleted = 0').run(nowIso(), profileId);
    return Number(result.changes ?? 0);
  },

  reactivate(relativePath: string): void {
    database.prepare('UPDATE images SET is_deleted = 0, updated_at = ? WHERE relative_path = ?').run(nowIso(), relativePath);
  },

  listFeed(page: number, limit: number): FeedImage[] {
    const offset = (page - 1) * limit;
    return database.prepare(
      `
      SELECT
        images.id,
        images.profile_id AS profileId,
        profiles.slug AS profileSlug,
        profiles.name AS profileName,
        images.filename,
        images.width,
        images.height,
        images.thumbnail_path AS thumbnailUrl,
        images.preview_path AS previewUrl,
        images.sort_timestamp AS sortTimestamp
      FROM images
      INNER JOIN profiles ON profiles.id = images.profile_id
      WHERE images.is_deleted = 0
      ORDER BY images.sort_timestamp DESC, images.id DESC
      LIMIT ? OFFSET ?
      `
    ).all(limit, offset) as unknown as FeedImage[];
  },

  countFeed(): number {
    return Number((database.prepare('SELECT COUNT(*) AS count FROM images WHERE is_deleted = 0').get() as { count: number }).count);
  },

  listProfileImages(profileId: number, page: number, limit: number): FeedImage[] {
    const offset = (page - 1) * limit;
    return database.prepare(
      `
      SELECT
        images.id,
        images.profile_id AS profileId,
        profiles.slug AS profileSlug,
        profiles.name AS profileName,
        images.filename,
        images.width,
        images.height,
        images.thumbnail_path AS thumbnailUrl,
        images.preview_path AS previewUrl,
        images.sort_timestamp AS sortTimestamp
      FROM images
      INNER JOIN profiles ON profiles.id = images.profile_id
      WHERE images.profile_id = ? AND images.is_deleted = 0
      ORDER BY images.sort_timestamp DESC, images.id DESC
      LIMIT ? OFFSET ?
      `
    ).all(profileId, limit, offset) as unknown as FeedImage[];
  },

  countByProfile(profileId: number): number {
    return Number((database.prepare('SELECT COUNT(*) AS count FROM images WHERE profile_id = ? AND is_deleted = 0').get(profileId) as { count: number }).count);
  },

  getLatestProfileImageId(profileId: number): number | null {
    const row = database.prepare(
      'SELECT id FROM images WHERE profile_id = ? AND is_deleted = 0 ORDER BY sort_timestamp DESC, id DESC LIMIT 1'
    ).get(profileId) as { id: number } | undefined;
    return row?.id ?? null;
  },

  getImageDetail(id: number): ImageDetail | undefined {
    const detail = database.prepare(
      `
      SELECT
        images.id,
        images.profile_id AS profileId,
        profiles.slug AS profileSlug,
        profiles.name AS profileName,
        images.filename,
        images.width,
        images.height,
        images.relative_path AS relativePath,
        images.mime_type AS mimeType,
        images.file_size AS fileSize,
        images.thumbnail_path AS thumbnailUrl,
        images.preview_path AS previewUrl,
        images.absolute_path AS originalUrl,
        images.sort_timestamp AS sortTimestamp
      FROM images
      INNER JOIN profiles ON profiles.id = images.profile_id
      WHERE images.id = ? AND images.is_deleted = 0
      `
    ).get(id) as (Omit<ImageDetail, 'nextImageId' | 'previousImageId'> & { originalUrl: string }) | undefined;

    if (!detail) {
      return undefined;
    }

    const next = database.prepare(
      `
      SELECT id
      FROM images
      WHERE profile_id = ? AND is_deleted = 0
        AND (sort_timestamp < ? OR (sort_timestamp = ? AND id < ?))
      ORDER BY sort_timestamp DESC, id DESC
      LIMIT 1
      `
    ).get(detail.profileId, detail.sortTimestamp, detail.sortTimestamp, detail.id) as { id: number } | undefined;

    const previous = database.prepare(
      `
      SELECT id
      FROM images
      WHERE profile_id = ? AND is_deleted = 0
        AND (sort_timestamp > ? OR (sort_timestamp = ? AND id > ?))
      ORDER BY sort_timestamp ASC, id ASC
      LIMIT 1
      `
    ).get(detail.profileId, detail.sortTimestamp, detail.sortTimestamp, detail.id) as { id: number } | undefined;

    return {
      ...detail,
      nextImageId: next?.id ?? null,
      previousImageId: previous?.id ?? null
    };
  },

  countDeleted(): number {
    return Number((database.prepare('SELECT COUNT(*) AS count FROM images WHERE is_deleted = 1').get() as { count: number }).count);
  },

  countWithThumbnail(): number {
    return Number((database.prepare('SELECT COUNT(*) AS count FROM images WHERE is_deleted = 0 AND thumbnail_path IS NOT NULL').get() as { count: number }).count);
  },

  countWithPreview(): number {
    return Number((database.prepare('SELECT COUNT(*) AS count FROM images WHERE is_deleted = 0 AND preview_path IS NOT NULL').get() as { count: number }).count);
  }
};

export const likeRepository = {
  getByImageId(imageId: number): LikeRecord | undefined {
    return database.prepare('SELECT * FROM likes WHERE image_id = ?').get(imageId) as LikeRecord | undefined;
  },

  listLikedImages(): FeedImage[] {
    return database.prepare(
      `
      SELECT
        images.id,
        images.profile_id AS profileId,
        profiles.slug AS profileSlug,
        profiles.name AS profileName,
        images.filename,
        images.width,
        images.height,
        images.thumbnail_path AS thumbnailUrl,
        images.preview_path AS previewUrl,
        images.sort_timestamp AS sortTimestamp
      FROM likes
      INNER JOIN images ON images.id = likes.image_id
      INNER JOIN profiles ON profiles.id = images.profile_id
      WHERE images.is_deleted = 0
      ORDER BY likes.created_at DESC, likes.image_id DESC
      `
    ).all() as unknown as FeedImage[];
  },

  upsert(imageId: number): LikeRecord {
    database.prepare(
      `
      INSERT INTO likes (image_id, created_at)
      VALUES (?, ?)
      ON CONFLICT(image_id) DO UPDATE SET
        created_at = excluded.created_at
      `
    ).run(imageId, nowIso());

    return this.getByImageId(imageId) as LikeRecord;
  },

  remove(imageId: number): boolean {
    const result = database.prepare('DELETE FROM likes WHERE image_id = ?').run(imageId);
    return Number(result.changes ?? 0) > 0;
  }
};

export const appSettingsRepository = {
  get(key: string): string | null {
    const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as Pick<AppSettingRecord, 'value'> | undefined;
    return row?.value ?? null;
  },

  set(key: string, value: string): void {
    database
      .prepare(
        `
        INSERT INTO app_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `
      )
      .run(key, value);
  }
};

export const folderScanStateRepository = {
  getAll(): FolderScanStateRecord[] {
    return database.prepare('SELECT * FROM folder_scan_state ORDER BY folder_path ASC').all() as unknown as FolderScanStateRecord[];
  },

  upsert(input: UpsertFolderScanStateInput): void {
    database
      .prepare(
        `
        INSERT INTO folder_scan_state (folder_path, signature, file_count, max_mtime_ms, total_size, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(folder_path) DO UPDATE SET
          signature = excluded.signature,
          file_count = excluded.file_count,
          max_mtime_ms = excluded.max_mtime_ms,
          total_size = excluded.total_size,
          updated_at = excluded.updated_at
        `
      )
      .run(input.folderPath, input.signature, input.fileCount, input.maxMtimeMs, input.totalSize, nowIso());
  },

  deleteMissing(activeFolderPaths: string[]): number {
    if (activeFolderPaths.length === 0) {
      const result = database.prepare('DELETE FROM folder_scan_state').run();
      return Number(result.changes ?? 0);
    }

    const placeholders = activeFolderPaths.map(() => '?').join(', ');
    const statement = database.prepare(`DELETE FROM folder_scan_state WHERE folder_path NOT IN (${placeholders})`);
    const result = statement.run(...activeFolderPaths);
    return Number(result.changes ?? 0);
  }
};

export const scanRunRepository = {
  start(): number {
    const startedAt = nowIso();
    const result = database
      .prepare('INSERT INTO scan_runs (started_at, status, scanned_files, new_files, updated_files, removed_files) VALUES (?, ?, 0, 0, 0, 0)')
      .run(startedAt, 'running');

    return Number(result.lastInsertRowid);
  },

  finish(runId: number, input: Omit<ScanRunRecord, 'id' | 'started_at'>): void {
    database.prepare(
      `
      UPDATE scan_runs
      SET finished_at = ?, status = ?, scanned_files = ?, new_files = ?, updated_files = ?, removed_files = ?, error_text = ?
      WHERE id = ?
      `
    ).run(input.finished_at, input.status, input.scanned_files, input.new_files, input.updated_files, input.removed_files, input.error_text, runId);
  },

  latest(): ScanRunRecord | undefined {
    return database.prepare('SELECT * FROM scan_runs ORDER BY id DESC LIMIT 1').get() as ScanRunRecord | undefined;
  },

  latestCompleted(): ScanRunRecord | undefined {
    return database
      .prepare('SELECT * FROM scan_runs WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT 1')
      .get() as ScanRunRecord | undefined;
  }
};
