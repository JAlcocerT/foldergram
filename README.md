# Foldergram

Foldergram is a local-only photo and video gallery app for browsing folders in an Instagram-inspired layout. It indexes media from the configured gallery root, stores metadata in SQLite, generates thumbnails and previews, and serves a Vue 3 SPA over localhost.

## Stack

- Node.js 22 LTS
- `pnpm` workspace monorepo
- Express 5 + TypeScript
- Vue 3 + Vite + Vue Router 4 + Pinia
- built-in `node:sqlite`
- Sharp
- FFmpeg / FFprobe
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
- Each supported image or video file inside that folder becomes one indexed post.
- Images placed directly inside the gallery root are ignored.
- The backend scans the configured gallery root on startup, writes metadata to `data/db/gallery.sqlite` by default, and generates:
  - square feed/grid thumbnails in `data/thumbnails/`
  - larger detail previews in `data/previews/`
- Feed and folder requests read from SQLite only. They do not scan the filesystem during API requests.
- In development mode, Chokidar watches the configured gallery root and batches file changes before re-indexing.
- If the configured storage is unavailable, the app shows a library-unavailable state instead of soft-deleting indexed content.
- Folder pages include a `Posts` tab for all media and a `Reels` tab that filters to videos only.

## Supported media formats

Images:
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif` as static preview/thumbnail

Videos:
- `.mp4`
- `.mov`
- `.m4v`
- `.webm`
- `.mkv`

FFmpeg and FFprobe must be available on your local machine for video metadata, thumbnails, and preview MP4 generation.

Nested subfolders are ignored by design.

## Installation

### Docker with the published GHCR image

This is the recommended install path for most users.

1. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  foldergram:
    image: ghcr.io/sajjadalis/foldergram:latest
    ports:
      - "4175:4175"
    environment:
      PORT: 4175
      NODE_ENV: production
      DATA_ROOT: /app/data
      GALLERY_ROOT: /app/data/gallery
      DB_DIR: /app/data/db
      THUMBNAILS_DIR: /app/data/thumbnails
      PREVIEWS_DIR: /app/data/previews
    volumes:
      - ./data/gallery:/app/data/gallery
      - ./data/db:/app/data/db
      - ./data/thumbnails:/app/data/thumbnails
      - ./data/previews:/app/data/previews
    restart: unless-stopped
```

2. Put media under `./data/gallery/<folder-name>/`, or edit the left-hand side of the bind mounts to point at an existing library on another drive.
3. Start Foldergram:

```bash
docker compose up -d
```

4. Open `http://localhost:4175`.

Notes:

- The published GHCR image path for this repository is `ghcr.io/sajjadalis/foldergram`.
- Docker users do not need to create `.env`.
- The bind mounts keep your gallery, database, thumbnails, and previews on the host machine.
- Once a stable version is published, you can pin a release tag such as `ghcr.io/sajjadalis/foldergram:v1.0.0` instead of using `latest`.

### Docker from a local checkout

If you cloned the repository and want Docker to build the image locally instead of pulling from GHCR, use the included [docker-compose.yml](/home/sa/apps/insta/docker-compose.yml):

```bash
docker compose up -d --build
```

Open `http://localhost:4175`.

Useful Docker commands:

```bash
docker compose logs -f
docker compose down
```

If you want Docker to use host paths outside the repo, edit the left-hand side of the bind mounts in [docker-compose.yml](/home/sa/apps/insta/docker-compose.yml).

### Install from source without Docker

Use this if you want to run Foldergram directly with Node.js.

Requirements:

- Node.js 22
- npm included with Node.js
- FFmpeg and FFprobe available on your system `PATH`

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Edit `.env` if you want custom gallery, thumbnail, preview, or database locations.
4. Install dependencies:

```bash
npm install
```

5. Start development mode:

```bash
npm run dev
```

6. Or build and run production mode locally:

```bash
npm run build
npm start
```

Notes:

- npm works out of the box for install and root scripts.
- `npm run dev` starts the Vite client on `http://localhost:4175`, the API server on `http://localhost:4173`, and the VitePress docs site on `http://localhost:4174`.
- `npm run build` builds both the client and server, and `npm start` serves the built app from Express.
- `pnpm` remains supported if you prefer it. `pnpm install`, `pnpm run dev`, `pnpm run build`, and `pnpm start` use the same root scripts.

Maintainer note:

- The repository includes a GitHub Actions workflow at [publish-ghcr.yml](/home/sa/apps/insta/.github/workflows/publish-ghcr.yml) for publishing multi-arch images to GHCR.

## Manual rescan

```bash
npm run rescan
```

## Tests

```bash
npm test
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

Docker note:

- The included `docker-compose.yml` keeps fixed in-container paths under `/app/data`.
- By default, Docker bind-mounts these host paths:
  - `./data/gallery`
  - `./data/db`
  - `./data/thumbnails`
  - `./data/previews`
- If you want Docker to use locations like `/mnt/d/...`, edit only the left-hand side of the bind mounts in `docker-compose.yml`.
- Do not change the app's in-container `GALLERY_ROOT`, `DB_DIR`, `THUMBNAILS_DIR`, or `PREVIEWS_DIR` values away from `/app/...`.

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
- `GET /api/folders/:slug/images?page=1&limit=24&mediaType=video`
- `GET /api/likes`
- `GET /api/images/:id`
- `POST /api/images/:id/like`
- `DELETE /api/images/:id/like`
- `DELETE /api/images/:id`
- `GET /api/admin/stats`
- `POST /api/admin/rescan`
- `POST /api/admin/rebuild-index`
- `POST /api/admin/rebuild-thumbnails`
- `GET /api/originals/:id`

## Architecture summary

- `server/src/config`: environment and runtime directory setup
- `server/src/db`: schema and SQL repositories
- `server/src/services/scanner-service.ts`: startup scans, incremental scans, deletion handling
- `server/src/services/storage-service.ts`: configured storage availability and startup path handling
- `server/src/services/derivative-service.ts`: Sharp image derivatives plus FFmpeg video thumbnails and preview generation
- `server/src/services/watcher-service.ts`: debounced Chokidar watch mode
- `client/src/stores`: Pinia state for feed, folders, likes, viewer, and app stats
- `client/src/views`: home feed, folder page, likes page, and image detail page
- `client/src/components`: reusable UI shell and gallery components

## Why this scan/index strategy

- Full scans are idempotent and safe to rerun.
- Request-time performance stays fast because the API reads only from SQLite.
- The scanner uses a lightweight fingerprint of `relative_path + file_size + mtime_ms` to avoid unnecessary heavy hashing.
- `sort_timestamp` stays stable across rescans by preserving persisted sort data once an image is known.
- Dev watching batches filesystem bursts so one copy operation does not trigger repeated expensive media work.
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
