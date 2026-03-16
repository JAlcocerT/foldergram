---
title: Features
description: Verified product features and UI behaviors in the current Foldergram app.
---

# Features

This page documents what the current repository actually implements.

## Home

The home view is the primary feed surface.

It includes:

- three feed modes: Recent, Rediscover, and Random
- a top rail that can show Moments or Highlights
- a startup scan state when the first index is still being built
- a rebuild notice when the configured gallery root changed
- desktop recommendations for folders based on recency, likes, and recent navigation
- infinite loading for feed pagination

### Feed mode behavior

| Mode | What it does |
| --- | --- |
| Recent | "Newest posts first, with lighter runs from the same app folder." |
| Rediscover | "Older posts resurface when they are worth another look." |
| Random | "A fresh shuffle that stays steady while you browse." |

## Explore

Explore is a dedicated full-screen shell with a darker visual treatment.

It combines:

- a random feed source
- client-side ranking that boosts recent folder activity, liked folders, and recently opened folders
- folder search across name, slug, breadcrumb, and path
- local recent-search history stored in `localStorage`

Explore is a folder-search and serendipity surface, not a separate backend index.

## Library

Library lists every indexed folder and supports:

- free-text search
- sorting by recent activity, post count, name, or path
- quick navigation into folders
- delete actions from a context menu

### Folder deletion behavior

Library supports two delete flows:

| Flow | Behavior |
| --- | --- |
| Delete app folder | Deletes the folder's direct posts and their derivatives. Child app folders are kept. The source folder is only removed if it becomes empty. |
| Delete folder subtree | Removes the source folder subtree from disk, removes matching derivative subtrees, and deletes all affected indexed folders below that path. |

## Folder pages

A folder page is available at:

- `/folders/:slug`
- `/:slug` as an alias

Folder pages include:

- a folder header with avatar and counts
- a posts grid
- a reels tab when the folder contains videos
- infinite loading

The reels tab is a filtered view backed by the same folder endpoint using
`mediaType=video`.

## Post detail and modal flow

The post detail route is `/image/:id`.

Behavior depends on how the route is opened:

- from another page, it can render as a modal over the background route
- directly, it renders as a full page

The detail view includes:

- preview media
- previous and next navigation within the same folder and active media filter
- folder link and breadcrumb context
- size, dimensions, MIME type, and duration metadata
- like toggle
- original-file link
- delete action with confirmation

## Likes

Likes are stored locally in the `likes` table.

The Likes view:

- fetches from `GET /api/likes`
- shows liked posts ordered by like time
- updates optimistically in the UI
- drops deleted posts automatically when they are removed

There is no shared social layer behind likes.

## Moments

The home rail and `/moments/:id` view expose either:

- date-driven Moments
- fallback Highlights

The selected rail depends on timestamp coverage in the current library. The UI
uses the same route name for both and adapts to the returned payload labels.

## Settings

Settings is the operational control surface for the library.

It exposes:

- live scan status
- storage and index status
- last completed scan details
- manual scan
- thumbnail-only rebuild
- full library rebuild

### Rebuild actions

| Action | What changes |
| --- | --- |
| Scan Library | Runs a normal scan against the current gallery root. |
| Regenerate Thumbnails | Clears generated thumbnails and video poster images, then rebuilds them from indexed media only. |
| Rebuild Library | Clears indexed folders, posts, likes, folder scan state, and scan history, then rescans the active gallery root and reuses matching cached derivatives when possible. |

## Theme and local UI preferences

The client also persists a few local browser preferences:

- light or dark theme
- whether videos start muted
- last opened folder
- recently opened folders
- recent explore searches

These are stored in `localStorage` and are not synced anywhere else.

## What is intentionally missing

The current repository does **not** implement:

- uploads from the UI
- comments
- messaging
- notifications
- user accounts
- remote multi-user permissions
- cloud sync
- hierarchical album navigation
