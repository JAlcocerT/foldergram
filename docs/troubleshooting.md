---
title: Troubleshooting
description: Common Foldergram issues and the exact implementation details behind them.
---

# Troubleshooting

## The app says the library storage is unavailable

Foldergram checks the configured:

- gallery directory
- thumbnails directory
- previews directory

If any of those are unavailable, the UI reports the reason exposed by the
backend.

Check:

- the configured paths in `.env`
- whether those paths exist
- whether they are writable by the current process

## The database keeps resetting

If `DB_DIR` is unavailable, Foldergram falls back to an in-memory SQLite
database. That means indexed state disappears when the process stops.

Fix the configured database directory first.

## Nothing is being indexed

Start with the gallery structure rules:

- files directly inside `GALLERY_ROOT` are ignored
- hidden folders are ignored
- a folder is indexed only when it directly contains supported media

This will not be indexed:

```text
gallery/
  loose-file.jpg
  trips/
    oslo/
      notes.txt
```

This will be indexed:

```text
gallery/
  trips/
    oslo/
      IMG_0001.jpg
```

## Rescan returns a rebuild-required message

This happens when the configured gallery root changed after a prior successful
library index already existed.

Use Settings or `POST /api/admin/rebuild-index` to rebuild the library against
the new root.

## Moments are missing and highlights appear instead

That is expected when the library does not have enough EXIF-backed timestamps.

Foldergram switches to Highlights unless it has:

- at least `24` indexed posts
- at least `18` EXIF-backed posts
- at least `30%` EXIF coverage

## Videos fail to index or generate previews

Check that both tools are installed and available on `PATH`:

- `ffprobe`
- `ffmpeg`

Foldergram uses them directly for supported video files.

## A video opens from the original file instead of a generated preview

That is a normal optimization. Foldergram streams the original file directly
when the video is already suitable for browser playback under the current size
and codec rules.

See [Media Processing](/media-processing) for the exact conditions.

## The development watcher is not reacting

The watcher is not a permanent always-on background process for every startup
path. It is development-only and is started by the scan and rebuild flows.

If needed:

1. run a manual scan from Settings
2. make your filesystem change again

## Likes disappeared after a rebuild

That is expected for a full library rebuild. The rebuild resets the indexed
library tables, including `likes`.

Thumbnail-only rebuilds do not clear likes.

## Docs build fails

Use the root command:

```bash
pnpm build:docs
```

If it fails, check for:

- broken internal links
- invalid frontmatter
- mistakes in `docs/.vitepress/config.ts`

## The app still behaves oddly in development after frontend changes

The client actively unregisters previously installed service workers in
development. Reload once after startup if you previously visited a production
build from the same origin and the browser still has stale cached assets.
