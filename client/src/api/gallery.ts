import type {
  AppStats,
  DeleteImageResult,
  ImageDetail,
  LikeMutationResult,
  LikesPayload,
  ManualScanResult,
  PaginatedFeed,
  ProfileImagesPayload,
  ProfileSummary
} from '../types/api';
import { requestJson } from './http';

export function fetchFeed(page = 1, limit = 24) {
  return requestJson<PaginatedFeed>(`/api/feed?page=${page}&limit=${limit}`);
}

export async function fetchProfiles() {
  const payload = await requestJson<{ items: ProfileSummary[] }>('/api/profiles');
  return payload.items;
}

export function fetchProfile(slug: string) {
  return requestJson<ProfileSummary>(`/api/profiles/${encodeURIComponent(slug)}`);
}

export function fetchProfileImages(slug: string, page = 1, limit = 24) {
  return requestJson<ProfileImagesPayload>(`/api/profiles/${encodeURIComponent(slug)}/images?page=${page}&limit=${limit}`);
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

export function fetchStats() {
  return requestJson<AppStats>('/api/admin/stats');
}

export function triggerManualScan() {
  return requestJson<ManualScanResult>('/api/admin/rescan', {
    method: 'POST'
  });
}
