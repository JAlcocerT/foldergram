export interface FeedItem {
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

export interface ProfileSummary {
  id: number;
  slug: string;
  name: string;
  folderPath: string;
  imageCount: number;
  avatarUrl: string | null;
}

export interface PaginatedFeed {
  items: FeedItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ProfileImagesPayload extends PaginatedFeed {
  profile: ProfileSummary;
}

export interface LikesPayload {
  items: FeedItem[];
}

export interface ImageDetail extends FeedItem {
  relativePath: string;
  mimeType: string;
  fileSize: number;
  originalUrl: string;
  nextImageId: number | null;
  previousImageId: number | null;
}

export interface DeleteImageResult {
  id: number;
  profileSlug: string;
}

export interface LikeMutationResult {
  id: number;
  liked: boolean;
  ok: boolean;
}

export interface AppStats {
  profiles: number;
  indexedImages: number;
  deletedImages: number;
  thumbnailCount: number;
  previewCount: number;
  storage: {
    available: boolean;
    reason: string | null;
    usingInMemoryDatabase: boolean;
  };
  lastScan: {
    id: number;
    started_at: string;
    finished_at: string | null;
    status: string;
    scanned_files: number;
    new_files: number;
    updated_files: number;
    removed_files: number;
    error_text: string | null;
  } | null;
}
