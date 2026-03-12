import type {
  AppStats,
  DeleteImageResult,
  DeleteFolderResult,
  ImageDetail,
  LikeMutationResult,
  LikesPayload,
  ManualScanResult,
  PaginatedFeed,
  FolderImagesPayload,
  FolderSummary
} from '../types/api';
import { requestJson } from './http';

export function fetchFeed(page = 1, limit = 24) {
  return requestJson<PaginatedFeed>(`/api/feed?page=${page}&limit=${limit}`);
}

export async function fetchFolders() {
  const payload = await requestJson<{ items: FolderSummary[] }>('/api/folders');
  return payload.items;
}

export function fetchFolder(slug: string) {
  return requestJson<FolderSummary>(`/api/folders/${encodeURIComponent(slug)}`);
}

export function fetchFolderImages(slug: string, page = 1, limit = 24) {
  return requestJson<FolderImagesPayload>(`/api/folders/${encodeURIComponent(slug)}/images?page=${page}&limit=${limit}`);
}

export function fetchImage(id: number) {
  return requestJson<ImageDetail>(`/api/images/${id}`);
}

export function fetchLikes() {
  return requestJson<LikesPayload>('/api/likes');
}

export function likeImage(id: number) {
  return requestJson<LikeMutationResult>(`/api/images/${id}/like`, {
    method: 'POST'
  });
}

export function unlikeImage(id: number) {
  return requestJson<LikeMutationResult>(`/api/images/${id}/like`, {
    method: 'DELETE'
  });
}

export function deleteImage(id: number) {
  return requestJson<DeleteImageResult>(`/api/images/${id}`, {
    method: 'DELETE'
  });
}

export function deleteFolder(slug: string) {
  return requestJson<DeleteFolderResult>(`/api/folders/${encodeURIComponent(slug)}`, {
    method: 'DELETE'
  });
}

export function fetchStats() {
  return requestJson<AppStats>('/api/admin/stats');
}

export function triggerManualScan() {
  return requestJson<ManualScanResult>('/api/admin/rescan', {
    method: 'POST'
  });
}
