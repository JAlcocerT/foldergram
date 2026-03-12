# Foldergram

Foldergram is a local-only photo gallery app for browsing folders in an Instagram-inspired layout. It indexes images from the configured gallery root, stores metadata in SQLite, generates thumbnails and previews with Sharp, and serves a Vue 3 SPA over localhost.

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
├─ server/
├─ .env.example
└─ README.md
```

## How it works

- Each direct child folder inside the configured `GALLERY_ROOT` becomes one indexed folder.
- Each supported image file inside that folder becomes one indexed post.
- Images placed directly inside the gallery root are ignored.
- The backend scans the configured gallery root on startup, writes metadata to `data/db/gallery.sqlite` by default, and generates:
  - square feed/grid thumbnails in `data/thumbnails/`
  - larger detail previews in `data/previews/`
- Feed and folder requests read from SQLite only. They do not scan the filesystem during API requests.
- In development mode, Chokidar watches the configured gallery root and batches file changes before re-indexing.
- If the configured storage is unavailable, the app shows a library-unavailable state instead of soft-deleting indexed content.

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
3. Add folders under `data/gallery/`, or point `GALLERY_ROOT` to an existing library path.
4. Add image files inside each folder.
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

The server performs an initial scan on startup. In development mode it also watches the configured gallery root for changes.

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
- folder slug generation
- derivative path generation
- path normalization for Windows-style separators

## Configuration

The app uses `.env` for local storage and runtime configuration.

With the default config, Foldergram creates and uses:

```text
data/
  gallery/
  db/
    gallery.sqlite
  thumbnails/
  previews/
```

If you want to place the library on another drive, update `GALLERY_ROOT` or the other path variables in `.env`.

If you already have an older local setup using top-level `gallery/`, `thumbnails/`, `previews/`, or `data/gallery.sqlite`, either move those into the new `data/` layout or point `.env` at the existing locations.

```env
PORT=4173
DATA_ROOT=./data
GALLERY_ROOT=./data/gallery
DB_DIR=./data/db
THUMBNAILS_DIR=./data/thumbnails
PREVIEWS_DIR=./data/previews
NODE_ENV=development
```

WSL note:

- if the server runs inside WSL, use WSL paths like `/mnt/d/...` instead of raw Windows paths like `D:\...`

## API endpoints

- `GET /api/health`
- `GET /api/feed?page=1&limit=24`
- `GET /api/folders`
- `GET /api/folders/:slug`
- `GET /api/folders/:slug/images?page=1&limit=24`
- `GET /api/likes`
- `GET /api/images/:id`
- `POST /api/images/:id/like`
- `DELETE /api/images/:id/like`
- `DELETE /api/images/:id`
- `GET /api/admin/stats`
- `POST /api/admin/rescan`
- `POST /api/admin/rebuild-index`
- `GET /api/originals/:id`

## Architecture summary

- `server/src/config`: environment and runtime directory setup
- `server/src/db`: schema and SQL repositories
- `server/src/services/scanner-service.ts`: startup scans, incremental scans, deletion handling
- `server/src/services/storage-service.ts`: configured storage availability and startup path handling
- `server/src/services/derivative-service.ts`: Sharp thumbnail and preview generation
- `server/src/services/watcher-service.ts`: debounced Chokidar watch mode
- `client/src/stores`: Pinia state for feed, folders, likes, viewer, and app stats
- `client/src/views`: home feed, folder page, likes page, and image detail page
- `client/src/components`: reusable UI shell and gallery components

## Why this scan/index strategy

- Full scans are idempotent and safe to rerun.
- Request-time performance stays fast because the API reads only from SQLite.
- The scanner uses a lightweight fingerprint of `relative_path + file_size + mtime_ms` to avoid unnecessary heavy hashing.
- `sort_timestamp` stays stable across rescans by preserving persisted sort data once an image is known.
- Dev watching batches filesystem bursts so one copy operation does not trigger repeated expensive image work.
- The current startup scan runs before the server starts listening, so very large libraries can delay first response until indexing finishes.

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
