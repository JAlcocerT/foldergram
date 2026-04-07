# Foldergram Local-Only Notes

This project is built around a local filesystem, not a cloud upload workflow.

## Core model

- Foldergram indexes media from the configured `GALLERY_ROOT`.
- Original files stay on disk in that folder tree.
- The app reads its library from SQLite plus generated thumbnails/previews.
- It does not upload or sync media anywhere.

## Adding photos

The intended way to add photos is to place them in folders under the gallery root.

Example local layout:

```text
data/
  gallery/
    Adultos/
      photo-1.jpg
    Ropa Bebe/
      De 1 a 3/
        photo-2.jpg
```

Rules that matter:

- Any non-hidden folder under `GALLERY_ROOT` that directly contains supported media becomes an app folder.
- Files placed directly in `GALLERY_ROOT` are ignored.
- Nested folders do not merge into their parent folder. If a nested folder contains media, it becomes its own app folder.

In development, the filesystem watcher should pick up new files automatically. If not, use Settings -> Scan Library or run:

```powershell
npm run rescan
```

## Uploads from the web UI

The current repository does not implement uploads from the UI.

That means:

- no drag-and-drop upload flow in the app
- no browser-based media import
- no cloud sync or remote media ingestion

## Deleting from the app

Foldergram supports more than one delete behavior.

For posts:

- default delete moves the post to Trash
- the original file stays on disk unless you choose permanent deletion

For folders:

- `Delete app folder` removes the folder's direct posts and derivatives
- child app folders are kept
- the source folder itself is only removed if it becomes empty
- `Delete folder subtree` permanently removes the source folder subtree from disk

## Practical takeaway

Foldergram should be treated as a gallery and index over your folders.

Use the filesystem to add media.
Use the web app to browse, like, rescan, rebuild, trash, restore, and optionally permanently delete media.
