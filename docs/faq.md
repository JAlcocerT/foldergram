---
title: FAQ
description: Short answers to common questions about Foldergram's actual scope and behavior.
---

# FAQ

## Is Foldergram a cloud product?

No. The current repository is designed for local-only, self-hosted use.

## Does it upload or sync my media to a cloud service?

No. Originals stay in the configured gallery root. The authenticated content
manager can upload browser-selected files into that local root, but it does not
send them to an external service.

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

## Does Foldergram have authentication?

Gallery viewing is public. A shared administrator password protects uploads,
edits, scans, Trash, and deletion.

It does **not** have individual user accounts or per-user permissions.

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

No. It is a separate trust check for browser-triggered mutations.

Foldergram's administrator password is the auth layer; the
local-origin mutation check is an additional safeguard around mutating routes.

## Does the app support remote multi-user access?

Not as a documented or hardened product target in the current repository.

The intended scope is still a single-user or shared-household local deployment,
not a full multi-user media portal.
