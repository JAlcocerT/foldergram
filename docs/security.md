---
title: Security
description: The real security posture of Foldergram, including mutation trust checks and local-only caveats.
---

# Security

Foldergram is built for local-only, self-hosted browsing on loopback addresses.
Its security model is intentionally narrow.

## What Foldergram assumes

- you run it on your own machine or trusted local network setup
- the primary browser origin is `localhost`, `127.0.0.1`, or `::1`
- there is no multi-user auth layer
- the app is not exposed directly to the public internet

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

- `SERVER_PORT`
- `DEV_CLIENT_PORT`

## What this protects against

This design helps reduce accidental or cross-site browser-triggered mutations
from untrusted origins when the app is being used locally.

It is especially relevant for:

- delete actions
- like toggles
- manual rescans
- rebuild operations

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

## Important limitations

Foldergram does **not** currently provide:

- authentication
- authorization
- TLS termination
- rate limiting
- audit logging
- hardened remote deployment defaults
- per-user isolation

## Practical advice

Use Foldergram like a local app:

- keep it on loopback unless you know exactly how you are proxying and protecting it
- do not assume the mutation checks are a full internet-facing security boundary
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
