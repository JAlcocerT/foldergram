---
title: API
description: Backend endpoints, parameters, response shapes, and mutation rules in Foldergram.
---

# API

All documented routes come from `server/src/routes/api.ts`.

## Base paths

| Base path | Purpose |
| --- | --- |
| `/api` | JSON API |
| `/thumbnails` | Static thumbnail derivatives |
| `/previews` | Static preview derivatives |

## Mutation requirements

All mutating API routes are protected by `requireTrustedMutationRequest`.

### Required header

```http
x-foldergram-intent: 1
```

### Local-origin checks

For mutating requests:

- if `Origin` is present, it must be `localhost`, `127.0.0.1`, or `::1`
- in development and test, the origin port must match `DEV_SERVER_PORT` or the reserved dev-client range from `DEV_CLIENT_PORT` through `DEV_CLIENT_PORT + 3`
- in production, loopback origins are allowed and same-host origins are allowed when they match the host serving the app on `SERVER_PORT`
- if `Origin` is absent but `Referer` is present, the same loopback check is applied to the referer origin

The shipped frontend adds `x-foldergram-intent: 1` automatically for `POST`,
`PUT`, `PATCH`, and `DELETE` requests.

## Common error behavior

| Status | When it happens |
| --- | --- |
| `400` | Validation or request-shape errors surfaced through the Express error handler. |
| `403` | Missing intent header or failed local-origin check on a mutating route. |
| `404` | Missing folder, post, moment, or original media. |
| `409` | A scan or thumbnail rebuild was requested while the library requires a full rebuild after a gallery-root change. |

## Read endpoints

### `GET /api/health`

Returns process-level health plus storage state.

Example shape:

```json
{
  "ok": true,
  "timestamp": "2026-03-16T12:34:56.000Z",
  "storage": {
    "available": true,
    "reason": null,
    "usingInMemoryDatabase": false
  }
}
```

### `GET /api/feed`

Query parameters:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | integer | `1` | Minimum `1`. |
| `limit` | integer | `24` | Minimum `1`, maximum `60`. |
| `mode` | `recent | rediscover | random` | `recent` | Home feed mode. |
| `seed` | integer | unset | Optional random seed for `random` mode. |

Response shape:

```json
{
  "mode": "recent",
  "items": [],
  "page": 1,
  "limit": 24,
  "total": 0,
  "hasMore": false
}
```

Notes:

- `items` contain both images and videos.
- `thumbnailUrl` points to `/thumbnails/...`.
- `previewUrl` points to `/previews/...` unless a video is served directly from its original file.

### `GET /api/feed/moments`

Returns the current home rail definition.

The rail can be:

- `moments`
- `highlights`

Response shape:

```json
{
  "railKind": "moments",
  "railTitle": "Moments",
  "railDescription": "Memory capsules shaped by real capture dates from your library.",
  "railSingularLabel": "Moment",
  "items": []
}
```

### `GET /api/feed/moments/:id`

Path parameters:

| Param | Type |
| --- | --- |
| `id` | string |

Query parameters:

| Param | Type | Default |
| --- | --- | --- |
| `page` | integer | `1` |
| `limit` | integer | `24` |

Returns `404` with `{"message":"Feed capsule not found"}` when the ID does not
exist in the currently selected rail.

### `GET /api/folders`

Returns:

```json
{
  "items": []
}
```

Each item is a folder summary with:

- `id`
- `slug`
- `name`
- `folderPath`
- `breadcrumb`
- `imageCount`
- `videoCount`
- `latestImageMtimeMs`
- `avatarUrl`

### `GET /api/folders/:slug`

Returns one folder summary.

Errors:

- `404` with `{"message":"Folder not found"}` if the slug is missing

### `GET /api/folders/:slug/images`

Query parameters:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | integer | `1` | Minimum `1`. |
| `limit` | integer | `24` | Minimum `1`, maximum `60`. |
| `mediaType` | `image | video` | unset | Optional folder filter. |

Response shape:

```json
{
  "folder": {
    "id": 1,
    "slug": "oslo",
    "name": "oslo",
    "folderPath": "trips/oslo",
    "breadcrumb": "trips",
    "imageCount": 12,
    "videoCount": 3,
    "latestImageMtimeMs": 1700000000000,
    "avatarUrl": "/thumbnails/trips/oslo/IMG_0001.webp?v=4"
  },
  "items": [],
  "page": 1,
  "limit": 24,
  "total": 12,
  "hasMore": false
}
```

Errors:

- `404` with `{"message":"Folder not found"}`

### `GET /api/likes`

Returns:

```json
{
  "items": []
}
```

Items are ordered by like timestamp descending.

### `GET /api/images/:id`

Query parameters:

| Param | Type | Notes |
| --- | --- | --- |
| `mediaType` | `image | video` | Optional filter used by the viewer when switching between posts and reels. |

Returns one post detail payload with:

- feed-item fields
- `relativePath`
- `mimeType`
- `fileSize`
- `originalUrl`
- `nextImageId`
- `previousImageId`

`nextImageId` and `previousImageId` are resolved within the same folder and the
same active `mediaType` filter when one is supplied.

Errors:

- `404` with `{"message":"Post not found"}`

### `GET /api/originals/:id`

Serves the original file from disk by image ID only.

Rules:

- the indexed path must still exist
- the resolved path must stay within `GALLERY_ROOT`
- deleted posts do not resolve

Errors:

- `404` with `{"message":"Original media not found"}`

### `GET /api/admin/stats`

Returns aggregated operational state.

Notable fields:

| Field | Notes |
| --- | --- |
| `folders` | Active indexed folders. |
| `indexedImages` | Active indexed posts. The name is historical and still includes videos in the total feed count. |
| `indexedVideos` | Active indexed videos only. |
| `deletedImages` | Soft-deleted post count. |
| `thumbnailCount` | Active posts with a thumbnail path. |
| `previewCount` | Active items with a preview output. Videos served directly from originals are excluded here. |
| `scan` | Live scan progress snapshot. |
| `storage` | Availability and in-memory-database state. |
| `libraryIndex` | Current and previous gallery-root state, plus rebuild requirement. |
| `lastScan` | Last completed scan run. |

## Mutating endpoints

### `POST /api/images/:id/like`

Marks a post as liked.

Success:

```json
{
  "ok": true,
  "id": 42,
  "liked": true
}
```

Errors:

- `404` with `{"message":"Image not found"}` when the post does not exist or is deleted
- `403` when trust requirements are missing

### `DELETE /api/images/:id/like`

Removes a like.

Success:

```json
{
  "ok": true,
  "id": 42,
  "liked": false
}
```

### `DELETE /api/images/:id`

Permanently deletes:

- the source file from disk
- its thumbnail derivative
- its preview derivative

Then it updates the index and folder avatar state.

Success:

```json
{
  "ok": true,
  "id": 42,
  "folderSlug": "oslo"
}
```

Errors:

- `404` with `{"message":"Image not found"}`
- `403` when trust requirements are missing

### `DELETE /api/folders/:slug`

Query parameters:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `deleteSourceFolder` | boolean | `false` | Accepts `true` or `false`. |

When `deleteSourceFolder=false`:

- direct posts in that folder are permanently deleted
- child folders below that path are kept
- Foldergram tries to remove now-empty directories

When `deleteSourceFolder=true`:

- the source folder subtree is removed from disk
- matching derivative subtrees are removed
- all indexed child folders under that subtree are removed

Success shape:

```json
{
  "ok": true,
  "slug": "oslo",
  "deletedImageCount": 12,
  "deletedFolderCount": 1,
  "deletedSourceFolder": false
}
```

Errors:

- `404` with `{"message":"Folder not found"}`
- `403` when trust requirements are missing

### `POST /api/admin/rescan`

Runs a manual scan against the current library and then starts the development
watcher.

Success:

```json
{
  "ok": true,
  "lastScan": {
    "id": 7,
    "status": "completed",
    "scanned_files": 120
  }
}
```

Errors:

- `409` with the library-rebuild-required message when the gallery root changed
- `500` for scan failures surfaced from the scanner

### `POST /api/admin/rebuild-index`

Stops the watcher, clears the indexed library tables, rescans the current
gallery root, and then restarts the watcher.

This resets:

- `likes`
- `images`
- `folders`
- `folder_scan_state`
- `scan_runs`

### `POST /api/admin/rebuild-thumbnails`

Stops the watcher, clears the thumbnail cache, regenerates thumbnails and video
poster images from indexed media, and restarts the watcher.

It does **not** reset:

- previews
- likes
- folder records
- scan history

Errors:

- `409` with the library-rebuild-required message when a full rebuild is required

## Client helpers

The frontend wraps these endpoints in `client/src/api/gallery.ts`.

Those helpers are the best reference for current client-side usage, including:

- default page sizes
- when `mediaType` is sent
- which routes are expected to return `items` arrays versus single objects
