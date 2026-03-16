<div align="center">

<img src="client/public/github_banner.png" alt="Foldergram" />
<br /><br />
<img src="client/public/favicon.svg" width="80" alt="Foldergram Logo" />

# Foldergram

**A blazing-fast, local-only photo and video gallery app for your folders, inspired by the Instagram layout.**

[![Available on GHCR](https://img.shields.io/badge/GHCR-foldergram-blue?style=flat-square&logo=docker)](https://github.com/foldergram/foldergram/pkgs/container/foldergram)
[![Node.js Version](https://img.shields.io/badge/Node.js-22%20LTS-green?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Vue 3](https://img.shields.io/badge/Vue.js-3-4fc08d?style=flat-square&logo=vuedotjs)](https://vuejs.org/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)

[Features](#-features) • [Installation](#-installation) • [Configuration](#%EF%B8%8F-configuration) • [Tech Stack](#-tech-stack)

</div>

---

Foldergram is a privacy-first, self-hosted web application that turns your local folders into a beautiful, feed-style gallery. It indexes media from a configured root directory, generates optimized thumbnails and previews, stores metadata in SQLite, and serves a lightning-fast Progressive Web App (PWA).

## ✨ Features

- **Instagram-Inspired UI:** Enjoy a familiar feed layout, dedicated folder pages, and a media viewer.
- **Reels & Video Support:** Seamless playback for videos with auto-generated previews.
- **Local-First & Private:** No cloud uploads, no tracking. Everything stays on your machine.
- **PWA Ready:** Install it on your desktop or mobile browser as a native-feeling app.
- **Auto-Sync:** Watch mode intelligently batches filesystem changes and updates the index automatically.
- **Resilient:** gracefully handles missing storage without soft-deleting your indexed content.

---

## 📂 How It Works

Foldergram maps directly to your filesystem with a simple, predictable structure:

1. **Albums as Folders:** Any non-hidden folder under the configured `GALLERY_ROOT` that directly contains supported media becomes one indexed album.
2. **Posts as Files:** Each supported image or video directly inside that folder becomes one indexed post for that album.
3. **Nested Folders Stay Separate:** Nested folders are not merged into their parent album. If a nested folder directly contains supported media, it becomes its own album. Files placed directly in `GALLERY_ROOT` are still ignored.

Upon startup, the backend scans your gallery, writes metadata to a local SQLite database, and generates square thumbnails and high-res previews for fast loading. Read-operations hit SQLite directly, meaning your filesystem isn't bottlenecked during API requests.

### Supported Formats

- **Images:** `.jpg`, `.jpeg`, `.png`, `.webp` (and `.gif` as static previews)
- **Videos:** `.mp4`, `.mov`, `.m4v`, `.webm`, `.mkv` _(Requires FFmpeg/FFprobe on your system)_

---

## 🚀 Installation

### 🐳 The Easy Way (Docker - Recommended)

This is the recommended path for most users. It uses the pre-built GitHub Container Registry (GHCR) image.

1. Create a `docker-compose.yml` file:

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

2. Place your media under your configured gallery mount (e.g., `./data/gallery/<folder-name>/`).
3. Start the container:

```bash
docker compose up -d
```

4. Open [http://localhost:4141](https://www.google.com/search?q=http://localhost:4141) in your browser!

### 💻 Build from Source

If you prefer to run it bare-metal, ensure you have **Node.js 22 LTS** and **FFmpeg/FFprobe** installed.

> **💡 Note:** This repository is set up as a workspace. **`pnpm` is highly preferred** for the best development experience, but standard `npm` is fully supported and works out of the box as a default.

1. Clone the repository:

```bash
git clone https://github.com/foldergram/foldergram.git
cd foldergram
```

2. Setup environment variables:

```bash
cp .env.example .env
```

3. Install dependencies:

```bash
pnpm install    # Preferred
# OR
npm install     # Default fallback
```

4. Start the development server (runs Vite, Express, and VitePress):

```bash
pnpm dev    # Preferred
# OR
npm run dev     # Default fallback

```

_Or build for production:_

```bash
pnpm build && pnpm start
# OR:
npm run build && npm start

```

---

## ⚙️ Configuration

Foldergram relies on `.env` variables for path configuration. By default, it creates a `data/` directory at the project root:

```text
data/
  ├─ gallery/          # Your original media
  ├─ db/
  │   └─ gallery.sqlite
  ├─ thumbnails/       # Auto-generated
  └─ previews/         # Auto-generated

```

**Environment Variables:**
| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `4141` | The port the Express server runs on. |
| `DEV_CLIENT_PORT` | `4142` | The Vite dev server port used by `pnpm dev`. |
| `GALLERY_ROOT` | `./data/gallery` | Where your raw media folders live. |
| `DB_DIR` | `./data/db` | Where the SQLite database is stored. |
| `THUMBNAILS_DIR`| `./data/thumbnails` | Output for square grid images. |
| `PREVIEWS_DIR` | `./data/previews` | Output for detail-view images/videos. |

_Note: If running in WSL, use WSL paths (e.g., `/mnt/d/images`) rather than raw Windows paths (`D:\images`)._

---

## 🛠 Tech Stack & Architecture

Foldergram is built to be lightweight where it matters, and robust where it counts.

**Backend:**

- **Node.js 22 LTS & Express 5:** Fast, modern backend foundation.
- **SQLite (`node:sqlite`):** Zero-config, built-in database for blazing-fast feed queries.
- **Sharp & FFmpeg:** High-performance media derivative generation.
- **Chokidar:** Reliable filesystem watching and debouncing.
- **Zod:** Runtime type validation.

**Frontend:**

- **Vue 3 & Vite:** Snappy, reactive UI and lightning-fast HMR.
- **Pinia & Vue Router 4:** State management and SPA routing.

**Performance Note:** Small libraries run well on a 2-core / 2GB RAM setup. Large or video-heavy libraries will benefit significantly from faster SSDs and multi-core CPUs during the initial indexing phase.

---

## ⌨️ Scripts & Development

- **Manual Rescan:** `npm run rescan`
- **Run Tests:** `npm test` (Covers scanner fingerprinting, slug generation, path normalization, etc.)
- **Default dev ports:** app server `4141`, Vite client `4142`, VitePress docs `4143`

For advanced tweaks, thumbnail sizes can be adjusted in `server/src/utils/image-utils.ts` (`THUMBNAIL_SIZE` & `PREVIEW_MAX_WIDTH`).
