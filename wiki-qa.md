# Foldergram Wiki: Technology & Design Q&A

A comprehensive guide to understanding how Foldergram works, the key technology choices, and the design decisions behind them.

---

## Technology & Architecture Summary

| Requirement | Specification | Decision / Clarification |
|:---|:---|:---|
| **Frontend Framework** | Vue 3 | SPA with Composition API + TypeScript for modern DX |
| **Build Tool** | Vite | Fast HMR, instant module replacement during development |
| **Styling/CSS** | UnoCSS | Atomic utility-first CSS framework with Iconify icon support (lighter than Tailwind) |
| **State Management** | Pinia | Official Vue state management for app/auth/feed/folders/likes/moments/trash/viewer stores |
| **Backend Framework** | Node.js 22 + Express 5 | ES modules, native SQLite, TypeScript, mature ecosystem |
| **Database** | SQLite (native `node:sqlite`) | Self-contained, no external server, single file portability, optimized for single-user workloads |
| **Authentication** | Shared-Password (Session-based) | Optional per-app, no multi-user accounts, stored as argon2 hash in SQLite |
| **Authorization** | Public API routes + Auth middleware | Rate-limited, CSRF-protected, cookie-based sessions |
| **Media Processing** | Sharp (images) + FFmpeg (video) | Pre-generated derivatives: thumbnails (640px) and previews (1500px) as WebP |
| **Image Indexing** | Full scan + Incremental watch | Chokidar watcher (dev-only, 700ms debounce); folder signatures for scan optimization |
| **File Watching** | Chokidar | Development-only filesystem watcher, batches changes before triggering scans |
| **Service Worker** | Custom PWA | Production-only registration; cached in dev to avoid stale issues; offline browsing support |
| **Workspace/Monorepo** | pnpm workspaces | Server + Client + Docs as separate packages with shared dependencies |
| **Testing** | Vitest | Server-side unit + integration tests; client has no formal tests (simple UI) |
| **Hosting** | Docker (Recommended) | ghcr.io/foldergram/foldergram; optional local source build |
| **Deployment Pattern** | Container-based | Single image, volumes for gallery/db/thumbnails/previews; `NODE_ENV=production` in Docker |
| **API Security** | CSRF protection + Rate limiting | Origin-based CSRF validation; 10/min auth attempts, 100/min admin endpoints |
| **Public Demo Mode** | Read-only API flag | `PUBLIC_DEMO_MODE=1` blocks all POST/PUT/PATCH/DELETE; used for foldergram.intentdeep.com |
| **Reverse Proxy Support** | CORS via env var | `CSRF_TRUSTED_ORIGINS` for HTTPS terminators; origin validation in middleware |
| **Data Persistence** | SQLite + File derivatives | Metadata in DB; thumbnails/previews mirrored by relative path for predictability |
| **Soft Delete** | Logical deletion flag | Posts marked `is_deleted=1` or `is_trashed=1` on scan/user-action; can be recovered |
| **Core Design Pattern** | Two-layer architecture | **Indexing layer** (async scanning) + **Runtime layer** (read-only SQLite + static assets) |

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Data Model & Storage](#data-model--storage)
4. [Scanning & Indexing](#scanning--indexing)
5. [Media Processing](#media-processing)
6. [Frontend Architecture](#frontend-architecture)
7. [Security & Authentication](#security--authentication)
8. [Feed & Discovery Algorithms](#feed--discovery-algorithms)
9. [Performance & Optimization](#performance--optimization)
10. [Deployment & Configuration](#deployment--configuration)

---

## Architecture

### Q: What is the core architectural pattern?

**A:** Foldergram uses a **two-layer separation of concerns**:

1. **Indexing Layer**: Scanner/indexer walks the gallery tree, updates SQLite, and generates derivatives asynchronously
2. **Runtime Layer**: Express API and Vue SPA read indexed data from SQLite and serve static derivative assets

This separation is the core performance decision in the project. Request handlers never scan the filesystem directly.

### Q: Why separate scanning from serving?

**A:** This design pattern provides:
- **Fast requests**: Runtime reads from indexed SQLite instead of live filesystem scans
- **Predictable performance**: No filesystem I/O latency on user requests
- **Efficient updates**: Derivatives are pre-generated during scans, not on-demand
- **Development experience**: Watcher can batch filesystem changes with debouncing rather than blocking requests

### Q: What are "App Folders"?

**A:** App Folders are the organizational unit mapping to Instagram-style profiles:
- Any non-hidden folder under `GALLERY_ROOT` that directly contains supported media becomes an indexed App Folder
- Each becomes a browsable "profile" with its own grid, posts, and Reels tab if videos exist
- Nested folders are treated as separate App Folders (e.g., `/parent-nested` if a parent has a nested subfolder with media)
- Files placed directly in `GALLERY_ROOT` are ignored

### Q: How does the folder hierarchical model work?

**A:**
```
GALLERY_ROOT/
├── trips/                          # App Folder (if contains media)
│   ├── IMG_001.jpg                # Post in "trips" folder
│   ├── subfolder/                 # Separate App Folder "trips/subfolder"
│   │   └── IMG_002.jpg            # Post in nested folder
│   └── another/                   # Another separate App Folder "trips/another"
│       └── IMG_003.jpg
├── family/                        # Another App Folder
│   └── photo1.jpg
└── misc-file.jpg                 # Ignored (root level)
```

Each level becomes its own indexed folder if it contains supported media directly.

---

## Tech Stack

### Q: Why Node.js 22 + Express 5?

**A:**
- **ES modules by default** (`"type": "module"` in package.json)
- **Native SQLite support** via `node:sqlite` (no external bindings)
- **TypeScript first-class support** with tsx for development
- **Mature ecosystem** for file processing (Sharp, FFmpeg, Chokidar)
- **Single language** for backend (Node.js) and frontend (Vue)

### Q: Why SQLite instead of a traditional database?

**A:**
- **Self-contained**: Single `.sqlite` file, no separate server to manage
- **Perfect for single-user workloads**: Designed for this exact use case
- **Built into Node.js**: No extra bindings or dependencies (as of recent versions)
- **Full-featured**: Supports indexes, foreign keys, transactions
- **Portable**: Database file can be backed up/moved easily
- **Performance**: Sufficient for metadata queries; original media isn't loaded from DB

### Q: Why Vue 3 + Vite for the frontend?

**A:**
- **Vue 3 Composition API**: Cleaner state management paired with Pinia
- **Vite**: Fast HMR, instant module replacement during development
- **Small bundle**: Vue + Pinia + Router is lightweight
- **SPA with Progressive Enhancement**: PWA support with service worker registration
- **UnoCSS**: Atomic CSS utility framework (lighter than Tailwind)

### Q: What is Pinia and why use it over Vuex?

**A:** Pinia is Vue's official state management library (successor to Vuex):
- **Simpler API**: Stores are defined as functions, not objects
- **TypeScript-friendly**: Better type inference
- **Smaller bundle**: Less boilerplate
- **App-wide persistence**: Used for theme, video mute state, last opened folder, recent folders

See `client/src/stores/` for examples: `app.ts`, `auth.ts`, `feed.ts`, `folders.ts`, etc.

### Q: Why UnoCSS instead of Tailwind?

**A:**
- **Lighter**: Smaller CSS output
- **Atomic utility-first**: Same DX as Tailwind
- **Icon support**: Built-in Iconify integration for Fluent icons
- **Directive transformer**: Custom CSS-in-JS transforms

---

## Data Model & Storage

### Q: What tables exist in the database schema?

**A:**

| Table | Purpose |
|-------|---------|
| `folders` | App Folder metadata (slug, name, folder path, avatar) |
| `images` | Individual posts (image/video metadata, paths, EXIF data, soft-delete state) |
| `scan_runs` | History of scan operations (status, counts, errors) |
| `app_settings` | Key-value app configuration (password hash, gallery root, rebuild flags) |
| `folder_scan_state` | Per-folder optimization state (signature for skip-scan shortcut) |
| `likes` | User's local likes (image_id, creation timestamp) |

### Q: What metadata is stored per image?

**A:**
- **File metadata**: filename, extension, MIME type, file size, mtime_ms, relative/absolute paths
- **Dimensions**: width, height (for images and videos)
- **Media type**: 'image' or 'video'
- **Duration**: For videos only
- **Fingerprint**: Derived from `relative_path + file_size + mtime_ms` to detect moved/modified files
- **Timestamps**: `sort_timestamp`, `taken_at` (from EXIF or file mtime), `taken_at_source` (exif|mtime|first_seen)
- **Derivatives**: paths to thumbnail and preview files
- **Video playback**: Strategy flag (original|preview) for direct playback vs transcoded
- **Soft-delete state**: `is_deleted`, `is_trashed`, `trashed_at` for recovery

### Q: Why the fingerprint field?

**A:** A fingerprint (`relative_path + file_size + mtime_ms`) uniquely identifies a file:
- **Detects moved files**: If a file moves to a different relative path, it gets a new fingerprint
- **Detects modified files**: If mtime changes, it's treated as a new version
- **Prevents duplicates**: Same fingerprint = same logical file across rescans
- **Enables reactivation**: If a file is soft-deleted and reappears with the same fingerprint, it can be reactivated

### Q: Why are there indexes on visibility flags?

**A:**
```sql
CREATE INDEX idx_images_visibility_flags ON images(is_deleted, is_trashed);
```

This enables fast filtering for:
- `WHERE is_deleted = 0` (show non-deleted posts)
- `WHERE is_deleted = 0 AND is_trashed = 0` (show visible posts)
- Pagination through the feed requires combining media type, sort order, and visibility in a single index

### Q: Why soft-delete instead of hard-delete?

**A:**
- **Recovery**: Users can restore deleted items from the trash
- **Audit trail**: Historical record of what existed (for scan consistency)
- **Reactivation**: If a file is accidentally deleted and restored to the filesystem, rescanning can reactivate it
- **Likes preservation**: Soft-deleted images can keep their like relationships until permanently deleted

---

## Scanning & Indexing

### Q: What is the full scan lifecycle?

**A:**

1. **Walk gallery tree**: Recursively discover all folders and supported files
2. **Stat supported files**: Gather file size, mtime, dimensions (via ffprobe/sharp)
3. **Resolve folder records**: Ensure each folder has a database entry with a stable slug
4. **Read media metadata**: Extract EXIF, video codec info, duration
5. **Mark missing files as deleted**: Compare scanned files to database entries
6. **Queue derivative work**: Create thumbnail/preview tasks for changed or missing outputs
7. **Write scan status**: Log results to `scan_runs` table

This lifecycle is triggered by:
- **Startup**: Full scan on application boot
- **Manual scan**: User triggers via Settings UI
- **Watcher**: Chokidar detects filesystem changes in development

### Q: How does the folder scan state optimization work?

**A:** Foldergram stores a per-folder "signature" in `folder_scan_state`:

```
signature = hash(file_count, total_size, max_mtime_ms)
```

If the signature matches on rescan, the scanner can skip reprocessing every file in that folder (shortcut). The shortcut is bypassed when:
- Gallery root path has changed
- Need to repair missing derivatives
- Metadata coverage is incomplete

### Q: Why debounce the filesystem watcher?

**A:** The chokidar watcher batches changes with a `700ms` debounce window:
- **Debouncing prevents thrashing**: Multiple rapid file changes (e.g., uploading 100 photos) trigger one scan, not 100
- **Incremental vs full scans**: File-level changes trigger incremental scans; directory add/remove trigger full scans
- **Development focus**: The watcher is only active in development mode (`import.meta.env.DEV`)
- **Production uses manual scan**: Users manually trigger scans via Settings or startup hook

### Q: How is stable sort order preserved?

**A:** Foldergram prevents older posts from jumping around on rescans:

1. If a file exists in the database, keep its prior `sort_timestamp`
2. If it's new, use `first_seen_at` if present
3. Otherwise, use current file `mtime_ms`

This ensures the feed order is predictable even after gallery rebuilds.

### Q: Why track `taken_at_source`?

**A:**
- **`taken_at_source = 'exif'`**: Trusted EXIF metadata (e.g., camera timestamp)
- **`taken_at_source = 'mtime'`**: Fallback to file modification time
- **`taken_at_source = 'first_seen'`**: First time Foldergram indexed the file

This determines which timestamps are eligible for:
- **Moments rail**: Requires 18+ posts with `taken_at_source = 'exif'`
- **Rediscover mode**: Surfaces older, liked posts
- **Feed ordering**: Recent mode prefers EXIF when available

---

## Media Processing

### Q: What derivative sizes are used?

**A:**

| Constant | Value | Used For |
|----------|-------|----------|
| `THUMBNAIL_SIZE` | 640px width | Feed cards, folder grids, avatars, video posters |
| `PREVIEW_MAX_WIDTH` | 1500px width | Detail-view previews |

No enlargement: smaller images are served at original size.

### Q: What are the image derivative rules?

**A:**

**Thumbnail (Feed)**:
- Auto-rotated (EXIF orientation applied)
- Resized to 640px width
- Encoded as WebP with quality 82

**Preview (Detail View)**:
- Auto-rotated
- Resized to 1500px width
- Encoded as WebP with quality 86

Example:
```
Source: gallery/trips/IMG_001.jpg
Thumbnail: thumbnails/trips/IMG_001.webp
Preview: previews/trips/IMG_001.webp
```

Mirroring relative paths keeps the derivative tree predictable and allows safe deletion per folder.

### Q: How are video thumbnails generated?

**A:** Using FFmpeg with the `thumbnail` filter:
- Picks a representative frame (usually middle-ish of the video)
- Resized to 640px width
- Encoded as WebP

### Q: What is the video playback strategy?

**A:**

**Direct original playback** (when possible):
- File extension is `.mp4`
- MP4 container compatible
- Codec: H.264
- Pixel format: `yuv420p`
- Audio: AAC or none
- File size: ≤ 24 MiB
- Width: ≤ 1500px

If all conditions met:
- `playbackStrategy = 'original'`
- Remove preview file if it exists
- Client receives `previewUrl` pointing at `/api/originals/:id`

**Transcoded preview** (fallback):
- Transcode to H.264 + AAC + yuv420p + faststart
- Max width 1500px
- `playbackStrategy = 'preview'`

This optimizes for browsers' native MP4 playback support while respecting file size and dimension constraints.

### Q: Why remove transcoded previews for direct playback videos?

**A:**
- **Storage savings**: No redundant derivative if original is already compatible
- **Quality**: Original is served as-is (no re-encoding loss)
- **Simplicity**: Clear signal to the client about which file to load

The `playbackStrategy` field tells the client which URL to use.

### Q: How are GIFs handled?

**A:**
- Accepted as supported image format
- Derivatives generated with `animated: false`
- Treats GIF derivatives as static image outputs, not animated pipelines
- Feed shows still frame thumbnail

### Q: Why use Sharp for images and FFmpeg for videos?

**A:**
- **Sharp**: Optimized C++ image library with rotation, resizing, format conversion
- **FFmpeg**: Standard tool for video probing and transcoding; handles complex codecs and formats

Separation of concerns: each tool excels at its domain.

---

## Frontend Architecture

### Q: How is the Vue app bootstrapped?

**A:**

1. **main.ts**: Create Vue app, install Pinia + Vue Router
2. **App.vue**: Root component with auth gate
3. **router/index.ts**: Define routes (Home, Explore, Library, Folder, etc.)
4. **stores/**: Global state (app, auth, feed, folders, likes, etc.)

Key startup steps:
- Disable service worker in development (to avoid stale cache issues)
- Initialize theme (light/dark from localStorage)
- Initialize video mute preference
- Initialize last opened folder
- Fetch auth status to determine if password protection is enabled

### Q: What stores exist and why?

**A:**

| Store | Purpose |
|-------|---------|
| `app.ts` | Global UI state (theme, video mute, stats, last opened folder) |
| `auth.ts` | Authentication state (logged in, password protection enabled) |
| `feed.ts` | Home feed state (Recent/Rediscover/Random modes, pagination) |
| `folders.ts` | App Folder list and current folder selection |
| `likes.ts` | Liked images and like counts |
| `explore.ts` | Explore tab state |
| `moments.ts` | Moments/Highlights rail state |
| `trash.ts` | Soft-deleted items |
| `viewer.ts` | Image/video detail viewer modal state |

Each store manages its own API calls, caching, and derived state.

### Q: Why persist theme and video mute to localStorage?

**A:**
- **User preference persistence**: Survives page refresh
- **No server-side storage needed**: Client-side only
- **Instant load**: Applied before any visual flash

```typescript
const THEME_STORAGE_KEY = 'foldergram-theme';
const VIDEO_MUTED_STORAGE_KEY = 'foldergram-video-muted';
const LAST_OPENED_FOLDER_STORAGE_KEY = 'foldergram-last-opened-folder';
```

### Q: How is the PWA registered?

**A:**

```typescript
// main.ts (production only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

- **Production only**: Service worker not registered in development
- **Deferred registration**: Registered after page load (not blocking)
- **Graceful failure**: Catches errors; app remains usable without PWA

The service worker (`client/public/sw.js`) provides offline-like caching and fast repeat visits.

### Q: How does the router work?

**A:** Vue Router 4 defines routes like:
- `/` → Home feed
- `/explore` → Explore page
- `/library` → Library view
- `/folder/:slug` → Folder/profile page
- `/moments` → Moments/Highlights rail
- `/image/:id` → Image detail view (modal overlay)

Dynamic slug routing enables deep-linking to specific folders and handling nested folders:
- `/folder/trips` → App Folder "trips"
- `/folder/trips/subfolder` → Nested folder "trips/subfolder"

---

## Security & Authentication

### Q: What authentication approach does Foldergram use?

**A:** **Shared-password protection** configured from the Settings page:
- **Not multi-user**: Single password for all users (no accounts)
- **Session-based**: Password correct → httpOnly cookie set
- **SQLite-backed**: Password hash + session metadata stored in `app_settings` table
- **Optional**: Can be enabled/disabled from Settings
- **One-way hash**: Stored as argon2 hash (or similar), never plaintext

### Q: How are public API routes protected?

**A:**

Public routes (no auth required):
- `GET /health` → Server status
- `GET /auth/status` → Check if password protection enabled
- `POST /auth/login` → Submit password
- `POST /auth/logout` → Clear session

Protected routes:
- All other API calls require authenticated session
- Media routes (`/thumbnails`, `/previews`) also protected if auth enabled

Middleware stack:
```typescript
app.use('/api', blockPublicDemoMutations, requireTrustedMutationRequest, requireApiAuthentication, apiRouter);
app.use('/thumbnails', requireMediaAuthentication, express.static(...));
app.use('/previews', requireMediaAuthentication, express.static(...));
```

### Q: Why the `AUTH_REQUIRED_HEADER`?

**A:** Client-side communication of auth state:
```typescript
response.setHeader(AUTH_REQUIRED_HEADER, 'x-foldergram-auth-required', '1');
```

The client listens for this header and triggers `handleUnauthorized()` if the session expires, re-prompting for password without a full page reload.

### Q: What is public demo mode?

**A:** Environment flag `PUBLIC_DEMO_MODE=1` blocks mutations:
- All `POST`, `PUT`, `PATCH`, `DELETE` return `403 Forbidden`
- **Read-only API**: Browsing works, but editing/deletion is blocked
- Used for public deployments (e.g., foldergram.intentdeep.com)
- Requires `CSRF_TRUSTED_ORIGINS` configuration for HTTPS reverse proxies

### Q: How is CSRF protection implemented?

**A:**
```typescript
function requireTrustedMutationRequest(req, res, next) {
  if (isGetOrHeadRequest(req)) return next(); // Safe methods skip CSRF

  const origin = req.get('origin');
  if (isOriginTrusted(origin)) return next(); // Same-origin or trusted

  return res.status(403).json({ message: 'CSRF rejected' });
}
```

- **GET/HEAD**: Always allowed (safe methods)
- **POST/PUT/PATCH/DELETE**: Origin must match `origin` header
- **Cross-origin requests**: Blocked unless origin is in `CSRF_TRUSTED_ORIGINS`
- **Behind reverse proxy**: Set `CSRF_TRUSTED_ORIGINS=https://your-domain.com` in `.env`

### Q: Why rate-limit authentication endpoints?

**A:**
```typescript
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,      // 60 second window
  max: 10,                    // 10 attempts
  message: 'Too many auth attempts. Try again in a minute.'
});
```

- **Brute-force protection**: Limits password guessing (10 attempts per minute)
- **Applied to**: `/auth/login`, `/auth/configure-password`, `/auth/change-password`
- **Admin rate limit**: Separate, higher limit for `/settings/admin-*` endpoints (100 per minute)

---

## Feed & Discovery Algorithms

### Q: What feed modes exist?

**A:**

| Mode | Algorithm |
|------|-----------|
| **Recent** | Uses `taken_at` (EXIF) when available, otherwise `sort_timestamp`. Diversifies bursts from the same folder to avoid redundancy. |
| **Rediscover** | Surfaces posts older than 180 days; prioritizes liked items within that older pool for personalized rediscovery. |
| **Random** | Deterministic seeded shuffle; same seed = same order within a browsing session so pagination is stable. |

User switches between modes via home feed UI. Each mode has separate pagination state.

### Q: How is feed burst diversification done?

**A:**
```typescript
const DIVERSIFIED_FETCH_BATCH_SIZE = 72;
const MAX_DIVERSIFIED_CANDIDATES = 2400;
```

1. **Fetch candidates**: Pull 2400 most recent posts
2. **Group by folder**: Identify bursts (consecutive posts from same folder)
3. **Diversify**: Interleave posts from different folders to avoid "all photos from Italy" clusters
4. **Paginate**: Return 24 posts per page with burst interleaving

This keeps the feed visually diverse without manual curation.

### Q: How do Moments work?

**A:** Foldergram shows **date-based Moments** when there's enough EXIF data:

Requirements:
- ≥ 24 indexed posts
- ≥ 18 posts with `taken_at_source = 'exif'`
- ≥ 30% EXIF coverage overall

Date-driven capsules (if eligible):
- **On This Day**: Posts taken on this date in prior years
- **This Week**: Posts from 7 days around this date
- **Last Year Around Now**: Posts from 45-day window in the prior year

### Q: How are Highlights used?

**A:** Fallback when EXIF coverage is insufficient:

Curated capsules:
- **Recent Batches**: Recent posts grouped by folder
- **Forgotten Favorites**: Older liked posts
- **Deep Cuts**: Less-visible posts from smaller folders
- **Lucky Dip**: Random selection with seeded determinism

Each capsule is capped at 30 items max and uses the `HIGHLIGHT_BATCH_COUNT` logic to ensure visual distinction from the main feed.

### Q: Why the `HIGHLIGHT_FEED_OVERLAP_WINDOW = 18` constant?

**A:** Prevents the highlights rail from showing the same posts as the first feed screen:
- Rail is cached separately from feed pagination
- If overlap is too large, user sees duplicates scrolling down
- 18-post window keeps rail distinct and fresh

---

## Performance & Optimization

### Q: Why cache immutable derivatives?

**A:**
```typescript
response.setHeader('Cache-Control', 'public, max-age=604800, immutable');
```

Derivatives (thumbnails, previews) are **immutable** because:
- Generated once, path never changes
- If source file changes, relative path changes → new derivative path
- Browser can cache aggressively (7 days)
- 304 Not Modified reduces bandwidth

When auth is enabled:
```typescript
response.setHeader('Cache-Control', 'private, no-store');
response.setHeader('Vary', 'Cookie');
```

Prevents shared caches (proxies) from serving protected media to other users.

### Q: How are originals served securely?

**A:**
- **Not publicly listed**: Originals have no directory listing
- **ID-only access**: `/api/originals/:id` (ID is database-internal, not exposed in URLs)
- **Auth-protected**: `requireMediaAuthentication` middleware
- **No thumbnails**: Feed shows thumbnail derivative, not original

This prevents:
- Accidental exposure via reverse image search
- Direct filesystem path discovery
- Leaking the original quality until intentionally viewing details

### Q: Why is the app a SPA instead of SSR?

**A:**
- **All metadata in SQLite**: Client fetches data via API, not server-rendered
- **Offline PWA**: Service worker caching works better with SPA pattern
- **Lighter server**: No template rendering, just JSON API
- **Single build**: Client builds once, server serves static + API

### Q: How does the watcher avoid blocking requests?

**A:**
- **Separate process**: Watcher runs in its own event loop
- **Debouncing**: 700ms batching window queues work
- **No request handler blocking**: Scans happen asynchronously
- **Request handlers read SQLite**: No filesystem I/O on request path

---

## Deployment & Configuration

### Q: What environment variables are available?

**A:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | 4141 | Production Express port |
| `DEV_SERVER_PORT` | 4140 | Development API port |
| `DEV_CLIENT_PORT` | 4141 | Development Vite client port |
| `DATA_ROOT` | `./data` | App-managed storage root |
| `GALLERY_ROOT` | `./data/gallery` | Media source root |
| `DB_DIR` | `./data/db` | SQLite directory |
| `THUMBNAILS_DIR` | `./data/thumbnails` | Thumbnail output |
| `PREVIEWS_DIR` | `./data/previews` | Preview output |
| `SCAN_DISCOVERY_CONCURRENCY` | 4 | Folder discovery parallelism |
| `SCAN_DERIVATIVE_CONCURRENCY` | 4 | Derivative generation parallelism |
| `PUBLIC_DEMO_MODE` | 0 | Read-only API mode |
| `CSRF_TRUSTED_ORIGINS` | empty | Comma-separated trusted HTTPS origins |
| `NODE_ENV` | development | Runtime mode (development\|production) |

### Q: Why are concurrency limits set to 4?

**A:**
```typescript
SCAN_DISCOVERY_CONCURRENCY = 4  // Folder walk parallelism
SCAN_DERIVATIVE_CONCURRENCY = 4 // Thumbnail/preview generation parallelism
```

Balance:
- **Too low**: Slow scans, full CPU idle
- **Too high**: Resource thrashing, disk I/O bottleneck
- **4**: Reasonable for typical systems; can be tuned per deployment

Controlled via `p-limit` library.

### Q: How does Docker deployment work?

**A:**
```bash
docker compose up -d
```

- **Image**: `ghcr.io/foldergram/foldergram:latest` from GitHub Container Registry
- **Port**: 4141 inside container (map to 80/443 externally)
- **Volumes**: `data/gallery`, `data/db`, `data/thumbnails`, `data/previews`
- **Environment**: `NODE_ENV=production` (fixed in production)

docker-compose.yml manages volume mounts and reverse proxy configuration.

### Q: Why is there a library rebuild requirement?

**A:**
```typescript
LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY
LIBRARY_REBUILD_REQUIRED_SETTING_KEY
```

If `GALLERY_ROOT` path changes:
1. App detects the path mismatch
2. Marks library as requiring rebuild
3. Won't serve until user confirms rebuild from Settings

This prevents **silent cross-library drift**:
- Old database indexes media from `/old/path`
- New gallery root points to `/new/path`
- Without rebuild, feed shows wrong images or errors

### Q: What is the monorepo structure?

**A:**
```
foldergram/
├── server/          # Node.js + Express API
├── client/          # Vue 3 + Vite SPA
├── docs/            # VitePress documentation
├── docker-compose.yml
├── docker-compose.local.yml
├── Dockerfile
├── package.json     # Root workspace config
└── scripts/         # Workspace orchestration
```

**pnpm workspaces** manage all three as a single installation but separate build artifacts.

### Q: Why pnpm over npm?

**A:**
- **Monorepo support**: Native workspace management
- **Disk efficient**: Hard-linked dependencies (not duplicate copies)
- **Fast resolution**: Faster than npm for complex graphs
- **Strict dependency isolation**: Phantom dependency detection

Commands:
```bash
pnpm dev               # All three dev servers
pnpm dev:server       # API only
pnpm dev:client       # Client only
pnpm build            # Production build
pnpm start            # Run production
pnpm test             # Server tests (vitest)
pnpm rescan           # Manual rescan CLI
```

---

## Advanced Topics

### Q: How is the stable slug generated?

**A:**
```typescript
// slugifyFolderPath('gallery/trips/oslo')  → 'trips-oslo'
// resolveUniqueSlug('trips', db)           → 'trips' or 'trips-1' if duplicate
```

- **Slugify**: Folder path → URL-safe slug (lowercase, dashes)
- **Uniqueness**: Check database for collisions, append `-1`, `-2` if needed
- **Stability**: Same relative path → same slug across rescans
- **Used in routes**: `/folder/:slug` links depend on stable slugs

### Q: How does the image detail modal work?

**A:**
- **Overlay**: Image ID in URL query param (e.g., `?image=123`)
- **Route-driven**: Vue Router manages modal visibility
- **Gallery context**: Can navigate prev/next within folder's images
- **Lazy loading**: Detail metadata fetched on open (not in feed list)
- **Keyboard nav**: Arrow keys, Escape to close

### Q: Why separate soft-delete from trash?

**A:**

- **`is_deleted = 1`**: File missing from filesystem, marked during scan
- **`is_trashed = 1`**: User explicitly deleted from UI, can restore from trash

```sql
WHERE is_deleted = 0 AND is_trashed = 0  -- Show only visible
WHERE is_trashed = 1                      -- Show trash items only
```

User flow:
1. Delete image → marked `is_trashed = 1`
2. Rescan → if file still exists, unmarked `is_trashed`
3. Permanent delete → hard-delete row

### Q: How is the avatar image determined?

**A:**
- User can set an avatar image for each App Folder
- `folders.avatar_image_id` stores the image ID
- Thumbnail of that image shown as folder avatar
- Fallback to first image in folder if avatar is deleted

---

## Conclusion

Foldergram's design prioritizes:
1. **Simplicity**: Single user, no multi-tenancy
2. **Performance**: Indexed reads, pre-generated derivatives
3. **Reliability**: SQLite for durability, soft-delete for recovery
4. **Privacy**: Self-hosted, no cloud sync or external APIs
5. **User experience**: Instagram-familiar UI, smooth pagination, offline support

The two-layer architecture (indexing vs. serving) is the keystone that enables fast, predictable performance without complex caching strategies.
