# Foldergram Wiki: Features Lost if Converted to Static

A comprehensive analysis of what functionality would be lost if Foldergram were converted from a server-driven architecture to a pure static website deployment.

---

## Summary: Why Static Won't Work

Foldergram fundamentally depends on:
1. **A running Express server** - API endpoints, middleware, authentication
2. **SQLite database** - State persistence, metadata, audit trails
3. **Filesystem access** - Scanning, watching, derivative generation
4. **Real-time operations** - Scan status, derivative generation jobs

Converting to static (e.g., GitHub Pages, Vercel static hosting, S3) would require removing or drastically reimplementing these core systems.

---

## Critical Features Lost: Category Breakdown

### I. Authentication & Security Features

#### 1. **Shared-Password Protection** ❌ LOST

**Current implementation:**
```
- Password hash stored in SQLite
- Session cookies set by server
- Auth middleware validates on every request
- Rate limiting on login (10 attempts/min)
- CSRF validation on mutations
```

**With static site:**
- ❌ No server to validate passwords
- ❌ No cookies (or only client-side, unsecured)
- ❌ No rate limiting possible
- ❌ Password would need to be in client-side code (security nightmare)
- ❌ All visitors can see everything or nothing (all-or-nothing)

**Impact:** **SEVERE** - Homelab/private deployments lose access control entirely

#### 2. **CSRF Protection** ❌ LOST

**Current:**
```typescript
requireTrustedMutationRequest middleware validates:
- Origin header
- POST/PUT/PATCH/DELETE requests
- Throws 403 if untrusted origin
```

**With static site:**
- ❌ No server to perform origin validation
- ❌ Browser CORS would be the only check (weaker)
- ❌ Malicious sites could trigger mutations if JS is exposed

**Impact:** **MODERATE** - Mutations become vulnerable to CSRF attacks

#### 3. **Rate Limiting** ❌ LOST

**Current:**
```
- Auth attempts: 10/minute
- Admin actions: 100/minute
- Server-side enforcement via middleware
```

**With static site:**
- ❌ No server to track attempts
- ❌ Client-side rate limiting trivially bypassed
- ❌ Brute-force password attacks possible (if auth exists at all)
- ❌ DOS attacks via rapid API calls have no protection

**Impact:** **MODERATE-HIGH** - Opens door to abuse attacks

#### 4. **Media Access Control** ❌ LOST

**Current:**
```typescript
app.use('/thumbnails', requireMediaAuthentication, express.static(...));
app.use('/previews', requireMediaAuthentication, express.static(...));
```

**With static site:**
- ❌ Media files served directly (no auth layer)
- ❌ All photos accessible to anyone with the URL
- ❌ Privacy lost in private deployments

**Impact:** **SEVERE** - Private galleries become public

---

### II. Data Persistence & State Features

#### 5. **User Likes** ❌ LOST

**Current implementation:**
```sql
CREATE TABLE likes (
  image_id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Routes:
router.post('/images/:id/like')      -- Add like
router.delete('/images/:id/like')    -- Remove like
```

**With static site:**
- ❌ No database to store likes
- ❌ Likes could only persist in browser localStorage
- ❌ Syncing across devices impossible
- ❌ Clearing browser cache = lost likes
- ❌ Can't surface "Forgotten Favorites" (requires server-side like data)
- ❌ Rediscover mode loses "prioritize liked items" logic

**Impact:** **HIGH** - Personalization completely disappears

#### 6. **Soft-Delete & Trash System** ❌ LOST

**Current:**
```sql
CREATE TABLE images (
  is_deleted INTEGER NOT NULL DEFAULT 0,
  is_trashed INTEGER NOT NULL DEFAULT 0,
  trashed_at TEXT NULL,
  ...
);

-- Routes:
router.post('/images/:id/trash')     -- Soft-delete
router.post('/images/:id/restore')   -- Recover
router.delete('/images/:id')         -- Hard-delete
```

**With static site:**
- ❌ No database to track deletion state
- ❌ Delete operations can't soft-delete to trash
- ❌ No recovery mechanism
- ❌ Deleted files gone forever or visible again on rescan
- ❌ Lost audit trail of what was deleted

**Impact:** **HIGH** - Users can't safely delete and recover

#### 7. **Scan History & Run Logs** ❌ LOST

**Current:**
```sql
CREATE TABLE scan_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT NULL,
  status TEXT NOT NULL,
  scanned_files INTEGER NOT NULL DEFAULT 0,
  new_files INTEGER NOT NULL DEFAULT 0,
  updated_files INTEGER NOT NULL DEFAULT 0,
  removed_files INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NULL
);
```

**With static site:**
- ❌ No record of when scans happened
- ❌ No error logs from failed derivative generation
- ❌ Can't detect if scan is in progress (no `requireNoScanInProgress` guard)
- ❌ Lost troubleshooting data for missing/corrupted derivatives

**Impact:** **MODERATE** - Debugging and monitoring become impossible

#### 8. **App Settings & Configuration** ❌ LOST

**Current:**
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Stored settings:
- LAST_SUCCESSFUL_GALLERY_ROOT_SETTING_KEY
- LIBRARY_REBUILD_REQUIRED_SETTING_KEY
- PREVIOUS_GALLERY_ROOT_SETTING_KEY
- PASSWORD_HASH (argon2)
- PASSWORD_SALT
```

**With static site:**
- ❌ No place to store password hash securely
- ❌ Can't track which gallery root is indexed
- ❌ Lost library rebuild requirement flag
- ❌ Can't detect if gallery root changed (no cross-library drift protection)
- ❌ No per-app settings persistence

**Impact:** **HIGH** - Configuration and security setup lost

#### 9. **Folder Metadata** ❌ LOST

**Current:**
```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  avatar_image_id INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (avatar_image_id) REFERENCES images(id)
);
```

**With static site:**
- ❌ No place to store folder avatar selections
- ❌ No metadata about folder creation time
- ❌ Lost folder updates tracking
- ❌ Can't customize per-folder appearance

**Impact:** **MODERATE** - Folder customization lost

---

### III. Server-Side Operations & Admin Features

#### 10. **Manual Scan Trigger** ❌ LOST

**Current:**
```typescript
router.post('/admin/rescan', adminMutationRateLimiter, requireNoScanInProgress, async (_request, response) => {
  // Trigger filesystem walk, derivative generation, DB updates
  await scannerService.performFullScan();
  response.json({ message: 'Scan started', timestamp: new Date().toISOString() });
});
```

**With static site:**
- ❌ No way to trigger scans from UI
- ❌ Can't detect new files without rebuilding entire site
- ❌ Users must manually rebuild static site on every content change
- ❌ No incremental updates possible

**Impact:** **SEVERE** - Adding photos requires full site rebuild and redeploy

#### 11. **Incremental Scan Detection** ❌ LOST

**Current:**
```typescript
// folder_scan_state table tracks per-folder signatures
if (signature matches && metadata complete) {
  skip reprocessing this folder
}
```

**With static site:**
- ❌ No way to detect what changed since last build
- ❌ Every build must process every file (no skip-scan optimization)
- ❌ Massive performance hit on large galleries

**Impact:** **MODERATE-HIGH** - Build times explode with gallery size

#### 12. **File Watching (Development)** ❌ LOST

**Current:**
```typescript
// Chokidar watcher (dev-only) with 700ms debounce
if (import.meta.env.DEV) {
  watcherService.watch() // Auto-rescan on changes
}
```

**With static site:**
- ❌ No development watcher
- ❌ Developers must manually trigger rebuilds
- ❌ Tight feedback loop lost
- ❌ Development experience becomes tedious

**Impact:** **LOW** (dev-only, but affects developer happiness)

#### 13. **Thumbnail Rebuild Action** ❌ LOST

**Current:**
```typescript
router.post('/admin/rebuild-thumbnails', adminMutationRateLimiter, async (_request, response) => {
  // Remove thumbnail cache and regenerate
  await fsPromises.rm(appConfig.thumbnailsDir, { recursive: true });
  // ... rebuild logic
});
```

**With static site:**
- ❌ Can't regenerate just thumbnails without full rebuild
- ❌ No cache recovery mechanism
- ❌ Users stuck if derivatives get corrupted

**Impact:** **MODERATE** - Recovery options disappear

#### 14. **Library Rebuild Requirement Check** ❌ LOST

**Current:**
```typescript
// Check if gallery root changed
if (LIBRARY_REBUILD_REQUIRED_SETTING_KEY) {
  UI shows: "Library requires rebuild. Scan now?"
  // Prevent serving stale data
}
```

**With static site:**
- ❌ No way to detect if gallery root changed
- ❌ No protection against cross-library drift
- ❌ Wrong media could be indexed if path changes

**Impact:** **MODERATE** - Data consistency checks lost

---

### IV. Real-Time Feedback & Status Features

#### 15. **Scan Progress & Status** ❌ LOST

**Current:**
```typescript
router.get('/health', (_request, response) => {
  response.json({
    storage: { libraryAvailable: true, ... },
    scan: { inProgress: true, ... }
  });
});
```

**With static site:**
- ❌ No `/health` endpoint
- ❌ No way to know if scan is in progress
- ❌ No error status feedback to UI
- ❌ UI can't guard against concurrent scans

**Impact:** **MODERATE** - UI can't show operational status

#### 16. **Error Reporting from Scans** ❌ LOST

**Current:**
```sql
CREATE TABLE scan_runs (
  ...
  error_text TEXT NULL  -- Logs scan failures
);
```

**With static site:**
- ❌ No error logs
- ❌ Can't debug failed derivative generation
- ❌ Silent failures become invisible
- ❌ Users don't know why photos aren't showing up

**Impact:** **MODERATE** - Troubleshooting blind

---

### V. Dynamic Feed & Discovery Features

#### 17. **Real-Time Like Counts** ❌ LOST

**Current:**
```
GET /api/feed/... returns images with:
{
  id, thumbnailUrl, likeCount, isLiked, ...
}

Like count = count(image_id) from likes table
Is liked = current_user.likes.includes(image_id)
```

**With static site:**
- ❌ Like counts frozen at build time
- ❌ Can't update without rebuild
- ❌ "Is liked" state only in browser (lost on refresh)
- ❌ No cross-device like sync

**Impact:** **HIGH** - Like counts become stale

#### 18. **Moments Rail (Date-based)** ❌ MOSTLY LOST

**Current:**
```
Shows only if:
- ≥ 24 indexed posts
- ≥ 18 posts with taken_at_source = 'exif'
- ≥ 30% EXIF coverage

Capsules calculated server-side:
- On This Day
- This Week
- Last Year Around Now
```

**With static site:**
- ❌ Can't calculate "On This Day" (changes daily)
- ❌ Can't calculate "This Week" (changes weekly)
- ❌ Can't calculate "Last Year Around Now" (depends on current date)
- ❌ Must rebuild entire site daily for relevance
- ❌ Stale moments on older deployments

**Impact:** **MODERATE-HIGH** - Date-based discovery broken

#### 19. **Highlights Rail (Fallback Discovery)** ⚠️ PARTIALLY LOST

**Current:**
```
Server-side calculated from:
- Recent Batches
- Forgotten Favorites (old + liked)
- Deep Cuts (less-visible posts)
- Lucky Dip (seeded random)
```

**With static site:**
- ⚠️ Could potentially rebuild via static generator
- ❌ But "Forgotten Favorites" logic requires server-side like data
- ❌ "Recent Batches" become stale
- ❌ Random seed changes on rebuild (inconsistent shuffles)

**Impact:** **MODERATE** - Highlights become less intelligent

#### 20. **Rediscover Mode** ❌ LOST

**Current:**
```
GET /api/feed?mode=rediscover surfaces:
- Posts older than 180 days
- Prioritizes liked items within that pool
```

**With static site:**
- ❌ Can't filter by age (no runtime calculation)
- ❌ Can't prioritize by current likes (frozen at build)
- ❌ Static HTML can't differentiate based on user state

**Impact:** **MODERATE** - Personalized rediscovery broken

#### 21. **Random Mode with Stable Seeding** ❌ LOST

**Current:**
```
GET /api/feed?mode=random&seed=12345 returns same order
- Seed passed in request
- Server shuffles same way for same seed
- Pagination stable within session
```

**With static site:**
- ❌ Can't accept seed parameter
- ❌ All users see same random order
- ❌ No per-session stable shuffling
- ❌ Can't replicate feed on refresh

**Impact:** **LOW-MODERATE** - Less important than recent/rediscover

---

### VI. API Endpoint Features

#### 22. **API Authentication & Sessions** ❌ LOST

**Current:**
```typescript
router.post('/auth/login', (request, response) => {
  // Validate password, set httpOnly cookie
  response.cookie('session', token, { httpOnly: true });
});

// All endpoints require:
requireApiAuthentication(request, response, next)
```

**With static site:**
- ❌ No `/auth/login` endpoint
- ❌ No `/auth/logout` endpoint
- ❌ No `/auth/status` endpoint
- ❌ No session cookies
- ❌ No per-user authentication

**Impact:** **SEVERE** - Access control gone

#### 23. **Password Change Endpoints** ❌ LOST

**Current:**
```typescript
router.put('/auth/password', ...)           // Change password
router.delete('/auth/password', ...)        // Disable password
router.post('/auth/login', ...)             // Submit password
```

**With static site:**
- ❌ No password management UI
- ❌ No way to change security settings
- ❌ No endpoint to logout

**Impact:** **HIGH** - Users stuck with initial config

#### 24. **Image Deletion Endpoints** ❌ LOST

**Current:**
```typescript
router.post('/images/:id/trash', ...)       // Soft delete
router.post('/images/:id/restore', ...)     // Restore from trash
router.delete('/images/:id', ...)           // Permanent delete
```

**With static site:**
- ❌ Can't delete photos from UI
- ❌ Can't restore from trash
- ❌ Must manually edit filesystem
- ❌ No audit trail

**Impact:** **HIGH** - Content management impossible

#### 25. **Folder Deletion Endpoint** ❌ LOST

**Current:**
```typescript
router.delete('/folders/:slug', async (request, response) => {
  // Soft-delete folder + children, optionally delete source files
  const { deleteSourceFolder } = request.query;
  if (deleteSourceFolder) {
    // Remove filesystem directory
  }
});
```

**With static site:**
- ❌ Can't delete App Folders from UI
- ❌ Must manually delete from filesystem + rebuild

**Impact:** **MODERATE** - Folder management limited

#### 26. **Like/Unlike Endpoints** ❌ LOST

**Current:**
```typescript
router.post('/images/:id/like', ...)        // Add like
router.delete('/images/:id/like', ...)      // Remove like
```

**With static site:**
- ❌ Can't like/unlike photos
- ❌ Like feature becomes read-only or client-only
- ❌ Likes lost on page refresh

**Impact:** **HIGH** - Core engagement feature gone

---

### VII. Database & Metadata Features

#### 27. **EXIF Metadata Extraction & Storage** ⚠️ PARTIALLY LOST

**Current:**
```
Server extracts & stores:
- taken_at (timestamp)
- taken_at_source ('exif' | 'mtime' | 'first_seen')
- Camera metadata (in image metadata, not stored)

Used for:
- Recent feed ordering
- Moments rail eligibility
- Rediscover targeting
```

**With static site:**
- ⚠️ Could extract at build time
- ❌ But can't update on rescan without rebuild
- ❌ taken_at becomes stale if photos re-scanned
- ❌ taken_at_source tracking lost (all become 'unknown')

**Impact:** **MODERATE** - Metadata freshness issues

#### 28. **Fingerprint-Based File Change Detection** ❌ LOST

**Current:**
```
fingerprint = hash(relative_path + file_size + mtime_ms)
Used to detect:
- Moved files (path changes → new fingerprint)
- Modified files (mtime changes → new fingerprint)
- Unchanged files (same fingerprint → reuse old sort_timestamp)
```

**With static site:**
- ❌ No way to detect file changes between builds
- ❌ Every file treated as new on rebuild
- ❌ Feed order changes constantly
- ❌ Stable sort timestamps lost

**Impact:** **MODERATE-HIGH** - Feed becomes unstable

#### 29. **Folder Scan State Optimization** ❌ LOST

**Current:**
```sql
CREATE TABLE folder_scan_state (
  folder_path TEXT PRIMARY KEY,
  signature TEXT NOT NULL,
  file_count INTEGER,
  max_mtime_ms REAL,
  total_size INTEGER
);

If signature matches → skip reprocessing folder
```

**With static site:**
- ❌ No way to skip unchanged folders
- ❌ Every build must process every file
- ❌ Build times linear with gallery size
- ❌ No incremental optimization possible

**Impact:** **HIGH** - Build performance collapses at scale

#### 30. **Image Relative Path Tracking** ⚠️ PARTIALLY LOST

**Current:**
```
Tracks relative_path for each image
Used to:
- Mirror derivatives by relative path (predictable URLs)
- Detect file moves
- Safely delete folder subtrees
```

**With static site:**
- ⚠️ Could track at build time
- ❌ But can't handle dynamic filesystem operations
- ❌ If files move, stale URLs in static HTML

**Impact:** **MODERATE** - URL stability issues

---

### VIII. Multimedia & Derivative Features

#### 31. **Video Playback Strategy Selection** ⚠️ PARTIALLY LOST

**Current:**
```
On-demand decision: "Play original or transcoded?"
- Original if: H.264 + AAC + yuv420p + ≤24MB + ≤1500px wide
- Otherwise: Transcode to compatible MP4

Stored in: playbackStrategy column
Used: To tell client which URL to load
```

**With static site:**
- ⚠️ Could pre-compute at build time
- ❌ But can't change strategy without rebuild
- ❌ If original changes, strategy becomes stale
- ❌ Fixed playback choice for all users

**Impact:** **LOW-MODERATE** - Less flexibility, but workable

#### 32. **Server-Generated HTTP Range Requests** ⚠️ PARTIALLY LOST

**Current:**
```
Express serves /api/originals/:id with full video streaming
- Supports range requests (scrubbing)
- Supports partial content (206 responses)
```

**With static site:**
- ⚠️ Static servers CAN serve range requests
- ❌ But originals must be public (no auth layer)
- ❌ No ID-only access (must know filename/path)

**Impact:** **LOW** - Streaming still works, privacy lost

---

### IX. Content Organization & Navigation

#### 33. **Stable Slug Generation** ⚠️ MOSTLY WORKS

**Current:**
```
slugifyFolderPath('gallery/trips/oslo') → 'trips-oslo'
resolveUniqueSlug('trips', db) → 'trips' or 'trips-1' if collision
Stored in database for stability
```

**With static site:**
- ⚠️ Could compute at build time
- ❌ Collision resolution requires database
- ❌ Renaming folders breaks existing links
- ❌ No way to verify uniqueness without DB

**Impact:** **LOW-MODERATE** - Mostly solvable with static generator

#### 34. **Folder Avatar Selection** ❌ LOST

**Current:**
```
folders.avatar_image_id → Customizable per-folder avatar
```

**With static site:**
- ❌ No way to select per-folder avatar from UI
- ❌ Must default to first image or hard-code

**Impact:** **LOW** - Visual polish feature

#### 35. **Nested Folder Display (parent-nested routes)** ⚠️ PARTIALLY LOST

**Current:**
```
Dynamic slug generation: /folder/trips-subfolder
Route matching: /folder/:slug → database lookup
```

**With static site:**
- ⚠️ Static generator could create all nested routes
- ❌ But would need pre-knowledge of all paths
- ❌ No dynamic nesting if folders added later

**Impact:** **LOW-MODERATE** - Works if folder structure fixed

---

### X. Performance & Caching Features

#### 36. **Cache Headers & Immutable Derivatives** ⚠️ MOSTLY WORKS

**Current:**
```
response.setHeader('Cache-Control', 'public, max-age=604800, immutable');
```

**With static site:**
- ⚠️ Can set cache headers in static server config
- ✅ Immutable derivatives (same)
- ❌ But auth-protected versions need:
  - `Cache-Control: private, no-store`
  - `Vary: Cookie`
  - This requires server-side middleware

**Impact:** **LOW** - Mostly achievable, auth caching breaks

#### 37. **No-Store Headers for Protected Content** ❌ LOST

**Current:**
```
if (authService.isEnabled()) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Vary', 'Cookie');
}
```

**With static site:**
- ❌ Can't vary cache by session/user
- ❌ All users see same content (no per-user caching)

**Impact:** **MODERATE** - Cache behavior less secure

---

## Summary Table: What's Lost

| Feature | Impact | Severity | Alternative |
|---------|--------|----------|-------------|
| Password protection | Access control removed | SEVERE | None—static is public |
| Likes system | Personalization gone | HIGH | Browser localStorage (lossy) |
| Soft delete/Trash | Safe deletion gone | HIGH | Manual filesystem ops |
| Like counts | Stale data | HIGH | Pre-compute at build |
| Manual scan trigger | Manual rebuild needed | SEVERE | CLI-based rebuild only |
| Moments rail | Date-based discovery broken | MODERATE | Pre-render per day (tedious) |
| Rediscover mode | Stale recommendations | MODERATE | Pre-compute at build |
| Scan history | No audit trail | MODERATE | Loss of logs |
| EXIF extraction | Metadata stale | MODERATE | Extract at build time |
| Fingerprint tracking | Feed order unstable | MODERATE | Recompute every build |
| Folder scan optimization | Slow builds | HIGH | Process all files always |
| Real-time status | No operational visibility | MODERATE | Loss of feedback |
| Multi-device sync | Likes device-specific | MODERATE | None possible |
| Error reporting | Silent failures | MODERATE | Loss of logs |
| App settings | Config not persistent | HIGH | Hardcode or query string |
| Video playback strategy | Fixed strategy | LOW | Pre-compute at build |
| Folder customization | No per-folder avatars | LOW | First image default |

---

## What Could Still Work (With Caveats)

### ✅ Mostly Fine in Static:
- Basic photo/video viewing
- Instagram-style feed layout (but sorted by build time, not dynamically)
- Folder browsing (if folder structure doesn't change)
- Explore tab (if pre-generated)
- Library search (if client-side JavaScript pre-indexes all files)
- Detail view (if images pre-rendered)
- Highlights rail (if pre-computed at build)

### ⚠️ Partially Workable:
- Moments rail (would need daily rebuilds to be dynamic)
- Random mode (frozen shuffle at build time)
- Video playback (auth layer lost)
- Nested folders (must be known in advance)

### ❌ Impossible in Static:
- Likes/engagement
- Deletion/recovery
- Password protection
- Admin controls
- Any mutations
- Per-user state
- Real-time feedback

---

## Why Static Conversion Isn't Practical

1. **Likes are the killer feature** - They require per-user state in a database
2. **Admin operations require a server** - Scans, rebuilds, deletions can't be static
3. **Security depends on server** - Password protection, CSRF, rate limiting all server-side
4. **Dynamic moments require daily updates** - "On This Day" and "This Week" change constantly
5. **Cross-device sync impossible** - Static has no way to sync state between devices
6. **Scan-driven updates are the whole model** - Without scans, can't detect new files

---

## The Real Cost: Developer Experience

Converting to static would mean:

```
User adds 50 new photos to GALLERY_ROOT
   ↓
Developer manually runs: npm run build
   ↓
Entire site regenerated (60 seconds for 10k photos)
   ↓
Static output rsynced to server
   ↓
New photos finally appear (5 minutes later)

With server version:
User adds 50 new photos to GALLERY_ROOT
   ↓
User clicks "Manual Scan" in Settings
   ↓
New photos appear (30 seconds later)
```

This is the fundamental tradeoff: **Server gives instant updates; static requires rebuilds**.

---

## Conclusion

Foldergram's architecture is deliberately **server-driven because that's what self-hosted photo galleries need**:

- ✅ Real-time operations (scan, delete, like)
- ✅ User state persistence (likes, settings)
- ✅ Access control (password protection)
- ✅ Incremental updates (not full rebuilds)
- ✅ Cross-device sync
- ✅ Admin controls

Converting to static would be technically possible but would transform Foldergram into something fundamentally different: a **read-only, pre-built gallery generator** rather than a **live, interactive self-hosted app**.

If you need static deployment, projects like:
- **Hugo + photo plugin** (static gallery generator)
- **Eleventy + image optimization** (flexible static builder)
- **Jekyll + Jekyll-image** (GitHub Pages compatible)

...are better suited than retrofitting a server-driven architecture to be static.
