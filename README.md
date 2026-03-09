# Local Gallery

Local-only photo gallery app for browsing folders in an Instagram-inspired layout. It indexes images from `gallery/`, stores metadata in SQLite, generates thumbnails and previews with Sharp, and serves a Vue 3 SPA over localhost.

## Stack

- Node.js 22 LTS
- `pnpm` workspace monorepo
- Express 5 + TypeScript
- Vue 3 + Vite + Vue Router 4 + Pinia
- built-in `node:sqlite`
- Sharp
- Chokidar
- Zod
- `p-limit`

## Project layout

```text
.
├─ client/
├─ data/
├─ gallery/
├─ previews/
├─ server/
└─ thumbnails/
```

## How it works

- Each direct child folder inside `gallery/` becomes one profile.
- Each supported image file inside that folder becomes one indexed post.
- The backend scans `gallery/` on startup, writes metadata to `data/gallery.sqlite`, and generates:
  - square feed/grid thumbnails in `thumbnails/`
  - larger detail previews in `previews/`
- Feed and profile requests read from SQLite only. They do not scan the filesystem during API requests.
- In development mode, Chokidar watches `gallery/` and batches file changes before re-indexing.

## Supported image formats

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif` as static preview/thumbnail

Nested subfolders are ignored by design.

## Setup

1. Copy `.env.example` to `.env`.
2. Keep the default paths unless you want custom directories.
3. Add profile folders under `gallery/`.
4. Add image files inside each profile folder.
5. Install dependencies:

```bash
pnpm install
```

## Run in development

```bash
pnpm dev
```

- Client: `http://localhost:5173`
- API: `http://localhost:4173`

The server performs an initial scan on startup. In development mode it also watches the gallery folder for changes.

## Build

```bash
pnpm build
```

This builds both the server and the client. In production mode the Express server will serve the built client if `client/dist` exists.

## Manual rescan

```bash
pnpm rescan
```

## Tests

```bash
pnpm test
```

Current tests cover:

- scanner utility fingerprinting
- stable feed sort timestamp behavior
- profile slug generation
- derivative path generation
- path normalization for Windows-style separators

## Environment variables

```env
PORT=4173
GALLERY_ROOT=./gallery
DATA_DIR=./data
THUMBNAILS_DIR=./thumbnails
PREVIEWS_DIR=./previews
NODE_ENV=development
```

## API endpoints

- `GET /api/health`
- `GET /api/feed?page=1&limit=24`
- `GET /api/profiles`
- `GET /api/profiles/:slug`
- `GET /api/profiles/:slug/images?page=1&limit=24`
- `GET /api/images/:id`
- `GET /api/admin/stats`
- `POST /api/admin/rescan`
- `GET /api/originals/:id`

## Architecture summary

- `server/src/config`: environment and runtime directory setup
- `server/src/db`: schema and SQL repositories
- `server/src/services/scanner-service.ts`: startup scans, incremental scans, deletion handling
- `server/src/services/derivative-service.ts`: Sharp thumbnail and preview generation
- `server/src/services/watcher-service.ts`: debounced Chokidar watch mode
- `client/src/stores`: Pinia state for feed, profiles, viewer, and app stats
- `client/src/views`: home feed, profile page, and image detail page
- `client/src/components`: reusable UI shell and gallery components

## Why this scan/index strategy

- Full scans are idempotent and safe to rerun.
- Request-time performance stays fast because the API reads only from SQLite.
- The scanner uses a lightweight fingerprint of `relative_path + file_size + mtime_ms` to avoid unnecessary heavy hashing.
- `sort_timestamp` stays stable across rescans by preserving persisted sort data once an image is known.
- Dev watching batches filesystem bursts so one copy operation does not trigger repeated expensive image work.

## Where to change thumbnail sizes later

Edit these constants in `server/src/utils/image-utils.ts`:

- `THUMBNAIL_SIZE`
- `PREVIEW_MAX_WIDTH`

## Where to customize the UI theme later

Edit `client/src/styles/main.css`.

The main theme tokens are declared near the top of that file:

- `--surface`
- `--border`
- `--shadow`
- `--accent`
- `--accent-soft`
- `--muted`
