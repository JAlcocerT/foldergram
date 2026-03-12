export interface FeedItem {
  id: number;
  folderId: number;
  folderSlug: string;
  folderName: string;
  folderPath: string;
  folderBreadcrumb: string | null;
  filename: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  previewUrl: string;
  sortTimestamp: number;
}

export interface FolderSummary {
  id: number;
  slug: string;
  name: string;
  folderPath: string;
  breadcrumb: string | null;
  imageCount: number;
  latestImageMtimeMs: number | null;
  avatarUrl: string | null;
}

export interface PaginatedFeed {
  items: FeedItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface FolderImagesPayload extends PaginatedFeed {
  folder: FolderSummary;
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
  folderSlug: string;
}

export interface DeleteFolderResult {
  slug: string;
  deletedImageCount: number;
}

export interface LikeMutationResult {
  id: number;
  liked: boolean;
  ok: boolean;
}

export interface ScanRunSummary {
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

export interface ScanProgress {
  isScanning: boolean;
  scanReason: string | null;
  phase: 'idle' | 'discovery' | 'derivatives';
  startedAt: string | null;
  runId: number | null;
  discoveredFolders: number;
  processedFolders: number;
  discoveredImages: number;
  processedImages: number;
  queuedDerivativeJobs: number;
  processedDerivativeJobs: number;
  generatedThumbnails: number;
  generatedPreviews: number;
  currentFolder: string | null;
  lastCompletedScan: ScanRunSummary | null;
}

export interface ManualScanResult {
  ok: boolean;
  lastScan: ScanRunSummary | null;
}

export interface RebuildLibraryResult {
  ok: boolean;
  lastScan: ScanRunSummary | null;
}

export interface AppStats {
  folders: number;
  indexedImages: number;
  deletedImages: number;
  thumbnailCount: number;
  previewCount: number;
  scan: ScanProgress;
  storage: {
    available: boolean;
    reason: string | null;
    usingInMemoryDatabase: boolean;
  };
  libraryIndex: {
    rebuildRequired: boolean;
    reason: 'gallery_root_changed' | null;
    currentGalleryRoot: string;
    previousGalleryRoot: string | null;
    lastSuccessfulGalleryRoot: string | null;
  };
  lastScan: ScanRunSummary | null;
}
