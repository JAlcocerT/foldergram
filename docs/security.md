---
title: Security
description: The real security posture of Foldergram, including administrator protection, mutation trust checks, and local-only caveats.
---

# Security

Foldergram is built for local-only and self-hosted browsing.
Its security model is intentionally narrow even though it now supports an
optional shared-password gate for homelab and LAN use.

## What Foldergram assumes

- you run it on your own machine or behind a trusted local-network or reverse-proxy setup
- the app is not exposed directly to the public internet without additional protection
- gallery viewing is anonymous; the built-in auth story protects one shared administrator role, not individual user accounts

## Administrator protection

Foldergram protects management operations with an administrator password
configured from the Settings page. Visitors do not need an account or password
to browse the gallery.

When enabled:

- Foldergram stores a one-way password hash, salt, and session metadata in SQLite `app_settings`
- the browser unlocks access with a signed `HttpOnly` session cookie
- gallery reads, originals, thumbnails, previews, and likes remain public
- uploads, metadata writes, scans, Settings, Trash, restore, and deletion require an administrator session
- authenticated API responses are marked `Cache-Control: no-store` and `Vary: Cookie`

Changing the administrator password rotates the session version, which
invalidates older sessions. Existing password settings are retained as a safe
migration path and can be replaced from Settings.

## Mutation protection

All mutating API routes pass through `requireTrustedMutationRequest`.

That middleware does two things:

1. Requires `x-foldergram-intent: 1`
2. Rejects non-loopback `Origin` or `Referer` values when those headers are present

Allowed hostnames are:

- `localhost`
- `127.0.0.1`
- `::1`

Allowed ports are:

- `DEV_SERVER_PORT` and the reserved `DEV_CLIENT_PORT` through `DEV_CLIENT_PORT + 3` range in development or test
- `SERVER_PORT` in production, with loopback origins or the exact host that served the app accepted for browser mutations
- explicit extra origins can be allowed through `CSRF_TRUSTED_ORIGINS`

## What this protects against

With password protection enabled, this design helps reduce opportunistic
browsing of the library from other machines on the same network.

Separately, the mutation checks help reduce accidental or cross-site
browser-triggered mutations from untrusted origins.

It is especially relevant for:

- feed and folder reads when password protection is enabled
- generated thumbnails and previews when password protection is enabled
- delete actions
- like toggles
- manual rescans
- rebuild operations
- gallery creation, media uploads, and frontmatter edits

## Content-management boundary

Unlike normal browsing and likes, content-management, scan, settings, Trash,
restore, and delete operations require an administrator session. The server
enforces this independently of which controls the frontend displays.

The upload and metadata layer also:

- confines all target folders to `GALLERY_ROOT`
- rejects absolute, traversal, and hidden paths
- accepts only Foldergram's supported media extensions
- limits requests to 100 files and 100 MB per file
- rejects case-insensitive filename collisions instead of overwriting media
- writes frontmatter through a temporary file and atomic rename

## Path confinement

Foldergram does not serve arbitrary filesystem paths from the client.

### Original-file serving

`GET /api/originals/:id`:

- looks up the post by numeric ID
- resolves the stored absolute path
- confirms that path is still within `GALLERY_ROOT`
- confirms the file still exists

### Delete actions

Delete flows resolve target files and directories inside configured roots before
removing them. If a stored path falls outside the expected root, the operation
throws instead of deleting blindly.

## Storage availability behavior

On startup, Foldergram checks:

- gallery directory
- thumbnails directory
- previews directory
- database directory

If the database directory is unavailable, it falls back to an in-memory
database. If the gallery or derivative directories are unavailable, the library
is marked unavailable and the UI receives explicit storage-state information.

This is a resilience measure, not a security feature.

## Rate limiting

Foldergram includes small in-memory rate limiters for:

- authentication attempts
- admin mutation routes such as rescan and rebuild operations

These limiters are process-local and intentionally simple. They are useful for
basic abuse reduction, not for hardened distributed deployments.

## Important limitations

Foldergram does **not** currently provide:

- multi-user authentication
- per-user authorization
- TLS termination
- audit logging
- hardened remote deployment defaults
- external identity provider integration
- per-user isolation

## Practical advice

Use Foldergram like a local app:

- use a strong administrator password if you expose it on a homelab or LAN
- keep it on loopback unless you know exactly how you are proxying and protecting it
- terminate HTTPS upstream if the app is reachable off-box
- remember that on plain HTTP, both the password and session cookie are visible to anyone who can sniff that local network traffic
- do not assume the administrator layer and mutation checks are a full internet-facing security boundary
- treat delete actions as destructive and permanent

## A precise caveat about headers

If a mutating request omits both `Origin` and `Referer`, the middleware still
accepts it as long as `x-foldergram-intent: 1` is present. That is acceptable
for the current local-only model, but it is one reason these checks should not
be described as a full remote-hardening story.

## What Foldergram does not try to be

Foldergram is not attempting to be:

- a cloud photo product
- a multi-user NAS portal
- a public media server with account management
- a zero-trust network service

The implementation is much closer to a private local gallery with a browser UI.
