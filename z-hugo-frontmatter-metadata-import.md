# Hugo Frontmatter Metadata Import

## Goal

Add support for reading Hugo-style `index.md` and `_index.md` files inside gallery folders so Foldergram can show:

- per-image imported captions from `resources[].title`
- optional folder descriptions from frontmatter `description`

Initial target:

- image detail route: `/image/:id`

Possible later expansion:

- feed cards
- folder pages
- library cards

## Why this feature exists

The migrated Hugo gallery already contains useful metadata that Foldergram currently ignores.

Examples:

- `description: Mantas multi-proposito`
- `resources:`
  - `src: manta1.jpeg`
  - `title: Manta para bebe`

Today Foldergram shows a filename-derived caption instead.

## Current behavior

Right now:

- the scanner only indexes supported media files
- Markdown files are ignored
- `/api/images/:id` does not return caption or folder description fields
- the image detail UI renders a readable filename as the post text

This means the metadata is present on disk but not used by the app.

## Proposed MVP

Implement imported metadata only for image detail pages.

When a user opens `/image/:id`:

1. Resolve the image's folder path.
2. Look for `index.md` or `_index.md` in that folder.
3. Parse frontmatter.
4. Read:
   - `description` as folder description
   - `resources[].src` matched to the current image filename
   - `resources[].title` as imported caption
5. Return those fields from `GET /api/images/:id`.
6. Render them in the image detail UI.

Fallback behavior:

- if no Markdown file exists, keep current behavior
- if metadata is missing for a file, keep current filename-based caption
- if parsing fails, log it and fall back safely

## Recommended implementation

### Backend

Add a small metadata reader in the server.

Suggested new module:

- `server/src/services/folder-metadata-service.ts`

Responsibilities:

- locate `index.md` or `_index.md`
- parse frontmatter
- normalize `resources[].src`
- expose:
  - `caption`
  - `folderDescription`

Suggested response shape addition for `GET /api/images/:id`:

```ts
interface ImageDetail {
  // existing fields...
  caption?: string | null;
  folderDescription?: string | null;
  captionSource?: 'filename' | 'frontmatter';
}
```

Implementation choice:

- keep this out of SQLite for the MVP
- resolve metadata at request time in `galleryService.getImageDetail`

Why:

- smallest code change
- no schema migration
- no rebuild requirement
- easier to prove value before widening scope

### Frontend

Update the image detail UI in:

- `client/src/components/ImageModal.vue`

Behavior:

- prefer `image.caption` when present
- otherwise keep the current readable filename
- optionally render `image.folderDescription` below the caption or in the folder context area

No route changes are required.

## Parsing strategy

The repo does not currently include a dedicated frontmatter parser in the server package.

Recommended approach:

- add a small parsing dependency rather than writing a fragile custom parser
- use a well-known frontmatter parser and YAML parser

Good options:

- `gray-matter`
- `yaml` plus a small frontmatter splitter

Recommendation:

- `gray-matter`

Reason:

- simplest implementation
- clearer failure behavior
- less likely to break on real-world Hugo frontmatter

## Matching rules

For the MVP, match imported captions by basename only:

- image filename: `manta1.jpeg`
- frontmatter `resources[].src`: `manta1.jpeg`

Normalization should include:

- case-insensitive compare
- slash normalization
- basename extraction when Hugo stored a relative path

If multiple entries match, take the first exact basename match.

## What could break

If implemented as described, the break risk is low.

### Things that should not break

- existing scans
- database schema
- existing routes
- existing folders with no Markdown metadata
- current filename-based captions

### Real risks

- invalid or unusual frontmatter may fail to parse
- some Hugo metadata may use encodings or characters that display oddly
- matching by filename alone may fail if `resources[].src` does not reflect the actual file name
- reading Markdown from disk on every image request adds some overhead

## How to avoid breakage

Use defensive rules:

- treat metadata as optional
- never fail the route because metadata parsing failed
- keep the current filename caption as the fallback
- log parse problems at warning level only
- cache parsed metadata per folder path and invalidate when the Markdown file mtime changes

That keeps the feature additive rather than disruptive.

## Performance note

For `/image/:id` only, request-time parsing is acceptable.

If the feature expands to feed cards or folder listings, request-time parsing becomes the wrong design. At that point the metadata should move into scan-time indexing and likely into SQLite.

## Later phase

If the MVP works well, phase 2 would be:

- add folder description support to folder pages
- add imported captions to feed cards
- store parsed metadata in the database during scans
- refresh metadata when `index.md` or `_index.md` changes

## Testing plan

Minimum tests:

- image detail returns filename caption when no Markdown exists
- image detail returns imported caption when `resources[].title` matches the file
- image detail returns folder description when present
- invalid frontmatter does not break the route
- `_index.md` works when `index.md` is absent

## Bottom line

Yes, this can be implemented without breaking the current app if it is done as an additive image-detail-only feature first.

The safest path is:

1. parse Hugo frontmatter on demand for `/api/images/:id`
2. expose optional caption and folder description fields
3. keep the current filename text as fallback
4. defer scan-time/database integration until the feature expands beyond `/image/:id`
