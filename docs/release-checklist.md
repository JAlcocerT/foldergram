# Release Checklist

Use this checklist before publishing a new GitHub release of Foldergram.

## One-time repository setup

- Confirm the default branch in GitHub is `main`. If not, update `.github/workflows/publish-ghcr.yml`.
- Confirm GitHub Actions is enabled for the repository.
- Confirm the workflow token can publish packages. The workflow uses `packages: write` with `GITHUB_TOKEN`.
- Decide whether GHCR packages should stay private or be made public after the first publish.

## Before tagging a release

- Update `README.md` and `.env.example` if any user-facing setup changed.
- Run `pnpm install`.
- Run `pnpm build`.
- Run `pnpm test`.
- Run `docker compose up -d --build` and verify the app starts on `http://localhost:4173`.
- Run `docker compose down` after the smoke test.
- Commit the release-ready changes to `main`.

## Publish the release

- Choose a semver tag like `v1.0.0`.
- Create and push the tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

- Wait for the `Publish GHCR Image` workflow to finish.
- Verify the package exists at `ghcr.io/<owner>/<repo>`.
- Verify the release tags look right:
  - `v1.0.0`
  - `1.0`
  - `latest` for stable releases
- Create or edit the GitHub Release notes.

## After publishing

- Pull the published image on a clean machine or VM:

```bash
docker pull ghcr.io/<owner>/<repo>:v1.0.0
```

- Confirm the published image starts correctly with the expected bind mounts.
- If you want end users to pull a published image instead of building locally, replace `build:` in `docker-compose.yml` with an `image:` reference that points at the GHCR package.
