# Captions & Folder Descriptions

Foldergram supports per-image captions and per-folder descriptions via sidecar markdown files — no database edits or UI needed. 

This is the closest thing to a Hugo-style content workflow inside Foldergram.

---

## How It Works

Place an `index.md` (or `_index.md`) file directly inside any App Folder. Foldergram reads it on request and caches it in memory until the file changes.

```
data/gallery/
└── winter-sweater/
    ├── index.md        ← captions + folder description
    ├── IMG_001.jpg
    ├── IMG_002.jpg
    └── IMG_003.jpg
```

---

## File Format

The file uses **YAML frontmatter** (the same format Hugo uses):

```yaml
---
description: "A cosy cable-knit sweater for winter 2024"
resources:
  - src: IMG_001.jpg
    title: "Front view, before blocking"
  - src: IMG_002.jpg
    title: "Detail of the cable pattern"
  - src: IMG_003.jpg
    title: "Finished and blocked"
---
```

| Field | Maps to | Shown in |
|-------|---------|----------|
| `description` | `folderDescription` | Folder / profile page |
| `resources[].src` | matched by filename (case-insensitive) | — |
| `resources[].title` | `caption` | Image detail view |

---

## Caption Fallback

If a photo has no matching entry in `resources`, the caption falls back to the **filename** automatically:

| Filename | Auto-caption |
|----------|-------------|
| `IMG_001.jpg` | `IMG 001` |
| `front_view.jpg` | `front view` |
| `cable-pattern.jpg` | `cable pattern` |

The `captionSource` field in the API response tells you which was used:

| Value | Meaning |
|-------|---------|
| `'frontmatter'` | Title came from `index.md` |
| `'filename'` | Fallback derived from filename |

---

## Caching

Foldergram caches parsed metadata **per file by `mtime`**. Edit `index.md` and save — the next request picks up the change automatically. No rescan needed.

---

## Multiple Folders

Each App Folder has its own independent `index.md`. Nested folders each get their own file too:

```
data/gallery/
├── winter-sweater/
│   ├── index.md        ← "description: Winter 2024 cable-knit"
│   ├── IMG_001.jpg
│   └── IMG_002.jpg
└── spring-shawl/
    ├── index.md        ← "description: Lightweight lace shawl"
    ├── photo-01.jpg
    └── photo-02.jpg
```

---

## Partial Coverage is Fine

You do not need to list every image in `resources`. Unlisted images fall back to filename captions. Listed images get the frontmatter title:

```yaml
---
description: "Spring shawl — lace weight merino"
resources:
  - src: photo-01.jpg
    title: "Blocked and pinned"
  # photo-02.jpg not listed → falls back to "photo 02"
---
```

---

## Code References

| File | Role |
|------|------|
| `server/src/services/folder-metadata-service.ts` | Reads, parses, and caches `index.md`; exposes `getFolderMetadata`, `getImageDetailMetadata`, `getFeedImageMetadata` |
| `server/src/types/models.ts` | Server-side types: `caption`, `captionSource`, `folderDescription` on `FeedImage` and `ImageDetail` |
| `client/src/types/api.ts` | Client-side mirror of the same fields on `FeedItem` and `ImageDetail` |

The parser handles:
- BOM stripping
- Windows line endings (`\r\n`)
- Inline YAML comments
- Single- and double-quoted string values
- Case-insensitive filename matching (`IMG_001.JPG` matches `src: img_001.jpg`)

---

## Will It Work on Cloudflare Pages?

**No — not as-is.** Cloudflare Pages is a static hosting platform. Foldergram has three hard dependencies that Cloudflare Pages cannot satisfy:

| Dependency | Why it's needed | Cloudflare Pages support |
|------------|----------------|--------------------------|
| Persistent Node.js/Express process | Serves API, handles auth, streams media | ❌ None |
| Local SQLite file | Stores folder/image index, likes, settings | ❌ No persistent filesystem |
| `GALLERY_ROOT` filesystem access | Scanner walks folders, reads files for derivatives | ❌ No filesystem |

### What About Cloudflare Workers / Pages Functions?

Cloudflare does offer compute at the edge, but the gaps remain:

| Cloudflare product | What it does | Gap |
|--------------------|-------------|-----|
| **Pages Functions** | Serverless JS per request | No persistent process, no filesystem, cold-start on every request |
| **Workers** | Edge JS runtime | Same limits — no `node:fs`, no Sharp, no FFmpeg |
| **D1** | SQLite-compatible edge DB | Could replace SQLite for reads, but the _scanner_ still needs a real server to populate it |
| **R2** | Object storage | Could host pre-generated thumbnails/previews, but generating them still needs a server |

The scanner, derivative generation (Sharp + FFmpeg), and filesystem watcher all require a real server.

Even if you swapped D1 for SQLite and R2 for file serving, you would still need a separate build server to run the scan and push results to D1/R2 — at which point you have a server anyway.

### The Closest Viable Hybrid

If Cloudflare is a hard requirement, the least-effort architecture would be:

```
┌─────────────────────────────────┐
│  Build server (VPS or CI job)   │
│  - Runs Foldergram scanner      │
│  - Generates derivatives        │
│  - Exports DB → JSON files      │
│  - Pushes assets to R2          │
└────────────┬────────────────────┘
             │ deploys static JSON + assets
             ▼
┌─────────────────────────────────┐
│  Cloudflare Pages + R2          │
│  - Serves Vue SPA               │
│  - Serves pre-built JSON feeds  │
│  - Serves thumbnails/previews   │
│  - No live API, no mutations    │
└─────────────────────────────────┘
```

**What you lose in this hybrid:**
- ❌ Likes (no database to write to)
- ❌ Trash / delete
- ❌ Manual scan trigger from UI
- ❌ Password protection
- ❌ Any mutation (read-only gallery)
- ❌ Dynamic Moments rail (would need a daily CI rebuild)

**What you keep:**
- ✅ Beautiful Foldergram UI
- ✅ Fast CDN delivery globally
- ✅ Feed browsing, folder profiles, detail view
- ✅ Captions from `index.md` (baked in at build time)
- ✅ Free hosting (Cloudflare Pages free tier)

This hybrid is essentially **rebuilding Foldergram as a static site generator** — a significant engineering effort, not a configuration change. 

For a single-user knitting gallery, a $5/month VPS running Foldergram natively is far simpler and delivers the full feature set.