---
title: Installation
description: Installation details, runtime expectations, and production build commands for Foldergram.
---

# Installation

## Recommended: Docker Compose

For most people, Docker Compose is the best way to install Foldergram.

It uses the pre-built container image and already includes the media tooling
needed for video support.

### 1. Create a working folder

Create a folder for Foldergram and move into it:

```bash
mkdir foldergram
cd foldergram
```

### 2. Create `docker-compose.yml`

Create a `docker-compose.yml` file with this content:

```yaml
services:
  foldergram:
    image: ghcr.io/foldergram/foldergram:latest
    ports:
      - "${SERVER_PORT:-4141}:${SERVER_PORT:-4141}"
    environment:
      SERVER_PORT: ${SERVER_PORT:-4141}
      NODE_ENV: production
      # Internal container paths (do not change)
      DATA_ROOT: /app/data
      GALLERY_ROOT: /app/data/gallery
      DB_DIR: /app/data/db
      THUMBNAILS_DIR: /app/data/thumbnails
      PREVIEWS_DIR: /app/data/previews
    volumes:
      # Change the left side to point to your media/data
      - ./data/gallery:/app/data/gallery
      - ./data/db:/app/data/db
      - ./data/thumbnails:/app/data/thumbnails
      - ./data/previews:/app/data/previews
    restart: unless-stopped
```

### 3. Create the local data folders

Create the directories that will be mounted into the container:

```bash
mkdir -p data/gallery data/db data/thumbnails data/previews
```

The layout should look like this:

```text
foldergram/
  docker-compose.yml
  data/
    gallery/
    db/
    thumbnails/
    previews/
```

### 4. Add your media

Place photos and videos inside folders under `data/gallery`.

Foldergram ignores loose files placed directly in the gallery root, so use a
structure like this:

```text
data/
  gallery/
    trips/
      oslo/
        IMG_0001.jpg
        clip-01.mp4
    family/
      summer-2024/
        porch.webp
```

### 5. Start Foldergram

Run:

```bash
docker compose up -d
```

### 6. Open the app

Open:

- `http://localhost:4141`

For a quick backend check, you can also open:

- `http://localhost:4141/api/health`

## If you already cloned this repository

This repository also includes a local `docker-compose.yml` and `Dockerfile` for
building the app image yourself from source instead of using the published GHCR
image.

From the repo root, run:

```bash
docker compose up -d
```

That local compose file:

- builds from the repo `Dockerfile`
- mounts the local `data` directories into `/app/data`
- runs the app in production mode

## Source install for development

Use the source install when you want to develop Foldergram itself.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The shipped `.env.example` keeps the development ports aligned like this:

- `DEV_CLIENT_PORT=4141` with client fallback through `4144`
- `DEV_SERVER_PORT=4140`

## Runtime requirements for source installs

| Requirement | Why it matters |
| --- | --- |
| Node.js 22 | Used across the workspace and CI configuration. |
| `pnpm` | Matches the workspace scripts and lockfile. |
| Writable local storage | Foldergram creates and maintains the gallery, database, thumbnails, and previews directories. |
| FFmpeg and FFprobe | Needed only when you run the app outside Docker and want supported video processing. The backend calls `ffprobe` for metadata and `ffmpeg` for video thumbnails and previews. |

## Supported media

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

## Default local paths

The shipped `.env.example` points at:

| Variable | Default |
| --- | --- |
| `DATA_ROOT` | `./data` |
| `GALLERY_ROOT` | `./data/gallery` |
| `DB_DIR` | `./data/db` |
| `THUMBNAILS_DIR` | `./data/thumbnails` |
| `PREVIEWS_DIR` | `./data/previews` |

Foldergram resolves relative paths from the repository root.

## Production behavior

### Docker

The Docker Compose install already runs the app in production mode.
It continues to use `SERVER_PORT`, with the compose file defaulting that to
`4141`.

### Source

The production app build is split from the docs build:

```bash
pnpm build
pnpm start
```

`pnpm build` builds:

- `server`
- `client`

It does **not** build the docs site.

### How production serving works

When `NODE_ENV=production`, the Express app serves `client/dist` if it exists.
Requests that do not start with `/api`, `/thumbnails`, or `/previews` fall back
to the SPA entry point.

## Docs build

The VitePress site is built separately:

```bash
pnpm build:docs
```

The deploy workflow publishes `./docs/.vitepress/dist`.

## Optional developer entry points

```bash
pnpm dev:server
pnpm dev:client
pnpm dev:docs
```

## First-run behavior

On startup, the server checks storage availability and then decides whether to:

- queue a startup scan
- keep using the existing index
- block scanning until a library rebuild happens after a gallery root change

If the configured database directory is unavailable, Foldergram falls back to an
in-memory SQLite database. If the gallery, thumbnails, or previews directories
are unavailable, the library is reported as unavailable instead of serving stale
filesystem assumptions.
