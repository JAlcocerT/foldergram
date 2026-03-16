---
title: FAQ
description: Short answers to common questions about Foldergram's actual scope and behavior.
---

# FAQ

## Is Foldergram a cloud product?

No. The current repository is designed for local-only, self-hosted use.

## Does it upload or sync my media anywhere?

No. Originals stay in the configured gallery root.

## Does it scan files directly during API requests?

No. Request handlers read from SQLite and derivative directories. Scanning is a
separate service.

## Are files in the gallery root indexed?

No. Foldergram ignores files placed directly in `GALLERY_ROOT`.

## Do nested folders merge into their parent album?

No. Nested folders become separate albums when they directly contain supported
media.

## Are likes shared with other users?

No. Likes are local rows in SQLite for the current library.

## Why does the API call posts "images" in some fields?

That naming is historical. The current app indexes both images and videos, and
several payload fields still use `image` terminology while carrying mixed media.

## Can Foldergram play videos directly from the original file?

Yes, sometimes. Compatible MP4 files within the current playback budget can skip
preview transcoding and stream directly from `/api/originals/:id`.

## Why would I use thumbnail rebuild instead of full rebuild?

Use thumbnail rebuild when the index is still correct and you only want to
regenerate feed/profile thumbnails and video poster images. Use full rebuild
when the gallery root changed or the index itself needs to be reset.

## Is the local-origin mutation check the same as authentication?

No. It is a small local-only trust check for browser-triggered mutations, not an
auth system.

## Does the app support remote multi-user access?

Not as a documented or hardened product target in the current repository.
