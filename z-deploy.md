# Local Deploy with File Browser

This note shows how to run Foldergram in Docker together with a File Browser sidecar that mounts the same gallery folder.

The goal is simple:

- Foldergram serves the gallery UI
- File Browser gives you a basic web UI for adding files into `data/gallery`
- Foldergram then rescans that folder and indexes the new media

## Important behavior

Foldergram is still filesystem-first.

- New photos are added by writing files into the gallery folder on disk.
- File Browser is only a helper UI on top of that folder.
- The standard Docker deployment runs Foldergram in production mode, so it does not use the development watcher.
- After uploads, run a scan from Foldergram Settings or trigger a rescan from the container.

## Directory layout

This setup assumes the repository root contains:

```text
data/
  gallery/
  db/
  thumbnails/
  previews/
  filebrowser/
    database/
    config/
```

Create the extra File Browser directories if they do not exist:

```powershell
New-Item -ItemType Directory -Force -Path .\data\filebrowser\database
New-Item -ItemType Directory -Force -Path .\data\filebrowser\config
```

## Compose overlay

Create a file named `docker-compose.filebrowser.yml` with this content:

```yaml
services:
  filebrowser:
    image: filebrowser/filebrowser
    ports:
      - "8080:80"
    volumes:
      - ./data/gallery:/srv #inside data/gallery is where all your folder are recognized!
      - ./data/filebrowser/database:/database
      - ./data/filebrowser/config:/config
    restart: unless-stopped
```

What this does:

- mounts Foldergram's gallery directory into File Browser at `/srv`
- keeps File Browser's own database separate from Foldergram
- exposes File Browser on `http://localhost:8080`

## Start the stack

If you want the published Foldergram image:

```sh
docker compose -f docker-compose.yml -f docker-compose.filebrowser.yml up -d
```

If you want to build Foldergram locally from this repository:

```sh
docker compose -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.filebrowser.yml up -d --build
```

After startup:

- Foldergram: `http://localhost:4141`
- File Browser: `http://localhost:8080`

## First File Browser login

On first boot, File Browser creates its own database and generates an `admin` password in the container logs.

View it with:

```powershell
docker compose -f docker-compose.yml -f docker-compose.filebrowser.yml logs filebrowser
```

If you are also using the local-build override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.filebrowser.yml logs filebrowser
```

Sign in to File Browser with:

- username: `admin`
- password: the one shown in the logs

## Create a restricted uploader user

File Browser is a general file manager, so "upload only" is approximate, not perfect.

The closest practical setup is a dedicated user that:

- can create files and folders
- cannot delete
- cannot rename
- cannot modify existing files
- cannot download
- cannot execute commands
- is scoped to the mounted gallery path only

Create that user:

```powershell
docker compose -f docker-compose.yml -f docker-compose.filebrowser.yml exec filebrowser `
  filebrowser users add uploader CHANGE_ME `
  -d /database/filebrowser.db `
  --scope /srv `
  --perm.admin=false `
  --perm.create=true `
  --perm.delete=false `
  --perm.download=false `
  --perm.execute=false `
  --perm.modify=false `
  --perm.rename=false `
  --perm.share=false
```

If you are also using the local-build override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.filebrowser.yml exec filebrowser `
  filebrowser users add uploader CHANGE_ME `
  -d /database/filebrowser.db `
  --scope /srv `
  --perm.admin=false `
  --perm.create=true `
  --perm.delete=false `
  --perm.download=false `
  --perm.execute=false `
  --perm.modify=false `
  --perm.rename=false `
  --perm.share=false
```

Replace `CHANGE_ME` with a real password before running the command.

Recommended usage:

- keep `admin` for yourself
- use `uploader` for adding gallery photos only

## Upload flow

1. Sign into File Browser as `uploader`.
2. Open the target folder under `/srv`.
3. Upload photos into an existing folder, or create a new folder and upload into it.
4. Open Foldergram and run `Settings -> Scan Library`.

You can also rescan from the container:

```powershell
docker compose -f docker-compose.yml -f docker-compose.filebrowser.yml exec foldergram pnpm rescan
```

If you are also using the local-build override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.filebrowser.yml exec foldergram pnpm rescan
```

## Folder rules that still apply

Foldergram keeps its normal filesystem rules:

- folders with media become app folders
- files placed directly in `data/gallery` are ignored
- nested folders become separate app folders if they directly contain media

So the safest upload pattern is:

```text
data/gallery/Album Name/photo-1.jpg
data/gallery/Album Name/photo-2.jpg
```

Not:

```text
data/gallery/photo-1.jpg
```

## Security notes

- Keep File Browser on your local machine or trusted LAN unless you add a proper reverse proxy and stronger access controls.
- Do not enable command execution.
- The restricted `uploader` account is meant to reduce risk, but it is not a full content moderation or multi-user permissions system.
