export interface ProfileRecord {
  id: number;
  slug: string;
  name: string;
  folder_path: string;
  avatar_image_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileSummaryRecord extends ProfileRecord {
  image_count: number;
  latest_image_mtime_ms: number | null;
}

export interface ImageRecord {
  id: number;
  profile_id: number;
  filename: string;
  extension: string;
  relative_path: string;
  absolute_path: string;
  file_size: number;
  width: number;
  height: number;
  mime_type: string;
  checksum_or_fingerprint: string;
  mtime_ms: number;
  first_seen_at: string;
  sort_timestamp: number;
  thumbnail_path: string;
  preview_path: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface ScanRunRecord {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  scanned_files: number;
  new_files: number;
  updated_files: number;
  removed_files: number;
  error_text: string | null;
}

export interface AppSettingRecord {
  key: string;
  value: string;
}

export interface FolderScanStateRecord {
  folder_path: string;
  signature: string;
  file_count: number;
  max_mtime_ms: number;
  total_size: number;
  updated_at: string;
}

export interface LikeRecord {
  image_id: number;
  created_at: string;
}

export interface FeedImage {
  id: number;
  profileId: number;
  profileSlug: string;
  profileName: string;
  filename: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  previewUrl: string;
  sortTimestamp: number;
}

export interface ImageDetail extends FeedImage {
  relativePath: string;
  mimeType: string;
  fileSize: number;
  originalUrl: string;
  nextImageId: number | null;
  previousImageId: number | null;
}
