# Hugo Frontmatter Metadata Import

## Status

Implemented.

This feature now reads Hugo-style `index.md` and `_index.md` files from gallery folders and uses that metadata in Foldergram without changing the database schema.

## What it does

Foldergram now imports these Hugo frontmatter fields:

- folder `description`
- `resources[].src`
- `resources[].title`

Current behavior:

- image detail pages use imported captions when a `resources[].title` matches the current file
- image detail pages show the folder `description` when present
- feed cards use imported captions when available
- folder pages show the folder `description` in the header

Fallback behavior:

- if no Markdown file exists, Foldergram keeps the old filename-based caption
- if a file is not listed in `resources`, Foldergram keeps the filename-based caption
- if frontmatter parsing fails, Foldergram ignores the metadata and falls back safely

## Surfaces covered

Implemented surfaces:

- `/image/:id`
- feed-style card views that render `FeedCard`
- folder pages such as `/folders/:slug`

Not implemented yet:

- library list cards
- search result metadata
- metadata indexed into SQLite

## How it works

The implementation is request-time and additive.

Flow:

1. Resolve the folder path for the current image or folder.
2. Look for `index.md` first, then `_index.md`.
3. Parse the frontmatter.
4. Read:
   - `description` as folder description
   - `resources[].src` matched by normalized basename
   - `resources[].title` as imported caption
5. Return those fields through the existing API payloads.
6. Render them in the client where supported.

No scan rebuild and no schema migration are required.

## Matching rules

Imported captions are matched by normalized basename.

Examples:

- image filename: `manta1.jpeg`
- frontmatter `resources[].src`: `manta1.jpeg`
- frontmatter `resources[].src`: `nested/MANTA1.JPEG`

Normalization includes:

- case-insensitive compare
- slash normalization
- basename extraction

If there is no match, Foldergram falls back to the readable filename caption.

## Files changed

Backend:

- [folder-metadata-service.ts](/C:/Users/j--e-/Desktop/foldergram/server/src/services/folder-metadata-service.ts)
- [gallery-service.ts](/C:/Users/j--e-/Desktop/foldergram/server/src/services/gallery-service.ts)
- [models.ts](/C:/Users/j--e-/Desktop/foldergram/server/src/types/models.ts)

Frontend:

- [api.ts](/C:/Users/j--e-/Desktop/foldergram/client/src/types/api.ts)
- [ImageModal.vue](/C:/Users/j--e-/Desktop/foldergram/client/src/components/ImageModal.vue)
- [FeedCard.vue](/C:/Users/j--e-/Desktop/foldergram/client/src/components/FeedCard.vue)
- [FolderHeader.vue](/C:/Users/j--e-/Desktop/foldergram/client/src/components/FolderHeader.vue)

Tests:

- [folder-metadata.test.ts](/C:/Users/j--e-/Desktop/foldergram/server/test/folder-metadata.test.ts)

## API impact

The API was extended additively.

`FeedItem` may now include:

```ts
caption?: string
captionSource?: 'filename' | 'frontmatter'
```

`FolderSummary` may now include:

```ts
folderDescription?: string | null
```

`ImageDetail` may now include:

```ts
caption?: string
captionSource?: 'filename' | 'frontmatter'
folderDescription?: string | null
```

These fields are optional so existing consumers do not break.

## Examples that should work now

Image detail examples:

- `http://localhost:4141/image/11`
  - file: `my-favourite-projects/conjunto-18meses.png`
  - caption: `Conjunto pantalón corto y chaqueta con capucha, talla 18 meses`
  - folder description: `Mis Proyectos Favoritos de costura...`

- `http://localhost:4141/image/111`
  - file: `Variados/Mantas/manta1.jpeg`
  - caption: `Manta para bebe`
  - folder description: `Mantas multi-proposito`

- `http://localhost:4141/image/117`
  - file: `Variados/Mantas/WhatsApp Image 2024-12-21 at 5.20.16 PM11.jpeg`
  - caption: `Manta de lana para sofa. Tejida a dos agujas`
  - folder description: `Mantas multi-proposito`

Folder page example:

- open the folder for `Variados/Mantas`
- the header should show `Mantas multi-proposito`

Feed behavior:

- any feed card for those same images should now show the imported caption instead of the filename-derived caption

## Safety and break risk

This implementation is low-risk because it is additive.

Things it does not change:

- scan behavior
- database schema
- existing routing
- existing media indexing

Known risks:

- malformed or unexpected frontmatter may be ignored
- some old Hugo files may contain encoding artifacts
- request-time metadata reads add a small amount of overhead

Mitigations in place:

- metadata is optional
- failures fall back to old behavior
- parsed metadata is cached by file path and mtime

## Verification performed

Verified with:

- `npx vitest run --pool=threads test/folder-metadata.test.ts`
- `npm run build`

The test coverage includes:

- imported caption on image detail
- folder description on image detail
- `_index.md` fallback
- basename matching for `resources[].src`
- invalid frontmatter fallback
- propagation into feed items and folder summaries

## Remaining next steps

If the feature needs to go further, the next reasonable expansions are:

- show imported metadata in library cards
- expose richer folder metadata such as Hugo `title`
- move metadata extraction into scan-time indexing if request-time lookup becomes too broad
