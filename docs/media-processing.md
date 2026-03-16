---
title: Media Processing
description: Supported formats, derivative generation rules, and video playback strategy in Foldergram.
---

# Media Processing

Foldergram generates derivatives so feed and detail views can stay fast without
touching original files at request time.

## Supported formats

### Images

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`

### Videos

- `.mp4`
- `.mov`
- `.m4v`
- `.webm`
- `.mkv`

## Output sizes

These values are defined in `server/src/utils/image-utils.ts`.

| Constant | Value | Used for |
| --- | --- | --- |
| `THUMBNAIL_SIZE` | `640` | Feed cards, folder grids, avatars, and video posters |
| `PREVIEW_MAX_WIDTH` | `1500` | Detail-view previews and transcodes |

## Derivative mapping

Foldergram mirrors relative source paths into the derivative roots.

| Source media | Thumbnail output | Preview output |
| --- | --- | --- |
| Image | `.webp` | `.webp` |
| Video | `.webp` | `.mp4` or direct original playback |

Examples:

| Source | Thumbnail | Preview |
| --- | --- | --- |
| `trips/oslo/IMG_0001.jpg` | `trips/oslo/IMG_0001.webp` | `trips/oslo/IMG_0001.webp` |
| `trips/oslo/clip-01.mov` | `trips/oslo/clip-01.webp` | `trips/oslo/clip-01.mp4` |

## Image derivatives

Images are processed with Sharp.

### Thumbnail

- auto-rotated
- resized to width `640` without enlargement
- encoded as WebP with `quality: 82`

### Preview

- auto-rotated
- resized to width `1500` without enlargement
- encoded as WebP with `quality: 86`

## Video metadata

Videos are probed with `ffprobe`.

Foldergram reads:

- width and height
- duration
- creation timestamps when present
- container and codec details used to decide playback strategy

## Video thumbnail generation

Video thumbnails are generated with `ffmpeg`:

- `thumbnail` filter picks a representative frame
- the frame is resized to width `640`
- output is encoded as WebP

## Video preview generation

When a video needs a derived preview, Foldergram transcodes it with `ffmpeg` to:

- H.264 video
- AAC audio when audio is present
- `yuv420p`
- `+faststart`
- maximum width `1500`

## Direct-original video playback

Foldergram can skip preview generation and stream the original video file
directly when all of these are true:

- the file extension is `.mp4`
- the container is compatible with MP4
- the video codec is H.264
- the pixel format is `yuv420p`
- the audio codec is AAC, or there is no audio track
- file size is `<= 24 MiB`
- width is `<= 1500`

When that happens:

- `playbackStrategy` is set to `original`
- the preview file is removed if it exists
- the client receives `previewUrl` pointing at `/api/originals/:id`

## GIF handling

GIF files are accepted as supported images, but derivatives are generated with
`animated: false`. In practice that means Foldergram treats GIF derivatives as
static image outputs, not animated preview pipelines.

## Timestamp sources

Foldergram resolves `taken_at` from the best available source:

- EXIF or embedded media metadata when available
- file modification time or first-seen timing when richer metadata is absent

Those timestamps influence:

- Recent feed ordering
- Moments eligibility
- Highlights fallback behavior

## Thumbnail-only rebuild

The thumbnail rebuild action:

- removes the thumbnail cache directory
- recreates it
- rebuilds thumbnails and video poster images for currently indexed media

It does not regenerate previews.

## Why derivatives are mirrored by relative path

Mirroring keeps the derivative tree predictable and lets Foldergram:

- resolve public asset URLs without exposing arbitrary filesystem paths
- reuse derivatives across scans when the relative source path still matches
- remove per-folder derivative trees safely during folder deletion
