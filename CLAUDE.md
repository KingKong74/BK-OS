# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**bailey.os (BK-OS)** is a personal "operating system for the browser" — a windowed Win98-style desktop on wide screens and a full-screen tabbed shell on phones. It's a Next.js app with a Postgres backend. Apps (My Computer, Notes, Projects, Infrastructure, games, etc.) render inside whichever shell the viewport selects. The README describes the original shell scaffold; the app has since grown a real auth layer, a DB-backed filesystem, WebDAV, and Docker integration — treat this file as the current picture.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build (output: 'standalone')
npm start            # serve the production build
npm run lint         # next lint
```

**DB migrations are hand-written SQL, not generated.** See the data-layer section below before changing the schema.

There is **no test suite**. Verify changes by running the app.

Dev environment is **Windows / PowerShell**. Resize the browser below 768px to exercise the mobile shell.

### Build caveats
- `next.config.mjs` sets `typescript.ignoreBuildErrors: true` — **the build will NOT catch type errors.** Run `npx tsc --noEmit` yourself to type-check, or rely on `npm run lint`.
- `skipTrailingSlashRedirect: true` is deliberate: WebDAV clients (Windows Explorer) don't follow 308 redirects, so `/api/webdav/` must not redirect.

## Required environment

- `DATABASE_URL` — Postgres connection string (required; used by `src/db/index.ts` and `drizzle.config.ts`).
- `AUTH_SECRET` — NextAuth/Auth.js v5 secret.
- `BKOS_MODE` — `private` (default, Bailey's full instance) or `public` (demo, sandboxed). Mirrored to the client as `NEXT_PUBLIC_BKOS_MODE`. Read via `src/lib/mode.ts` (`getServerMode` / `getClientMode`); apps filter by their manifest `visibility`.
- `BKOS_BLOB_DIR` — on-disk dir for binary file blobs (default `/data/blobs`).
- `DOCKER_SOCKET_PATH` — Docker socket for the Infrastructure app (default `/var/run/docker.sock`).

## Architecture

### Two shells, one app catalogue
`src/components/OS.tsx` is the root. It reads the viewport (`useMediaQuery`) and renders **`DesktopShell`** (menu bar + draggable `WindowFrame` windows + dock + launcher) or **`MobileShell`** (full-screen apps + home grid + tab bar). It also overlays `LockScreen` / `PoweredOff` / `RestartSequence` / `ShutdownSequence` based on store flags. The core principle: **an app component never knows which shell frames it.**

Adding an app is a three-step contract:
1. Append an `AppManifest` to `APPS` in `src/os/appsMeta.ts` (id, name, icon, accent, category, `origin`, `visibility`, optional `commands`, `defaultSize`, `pinned`, `url`).
2. Build the component in `src/apps/`.
3. Map `id -> component` in `src/os/registry.tsx`.

`renderApp(appId)` (registry.tsx) resolves the component; manifests with a `url` render through `WebApp` (iframe/external) instead of a local component; anything unmapped falls back to `PlaceholderApp`. Start Menu, Command Palette (Ctrl+K), search, dock, and mobile grid all derive from `APPS` automatically.

### Global UI state — Zustand (`src/os/store.ts`)
`useOS` is the single client store: window manager (open/focus/move/resize/snap/maximize, z-ordering), scene/theme, dock pins, desktop shortcuts, recycle bin, lock/power state, sticky notes, and assorted VFS overlays. It is **persisted to `localStorage` under the key `bailey-os`** via a `partialize` allowlist.

Two persistence nuances that bite if you forget them:
- **`stickyNotes` is intentionally NOT persisted to localStorage.** It is hydrated from `/api/notes` on every mount (`initNotes`) and written back to the server optimistically, with debounced sync for drag-moves and typing. Notes with non-UUID ids are legacy/client-only and skip server calls (see `isSyncableId`).
- The store also holds `vfsAdditions` / `fileContents` / `pathLabels` — client-side overlays on the **legacy in-memory** VFS. These coexist with the newer DB-backed filesystem (see below); be aware which filesystem a given app talks to.

### Themes
Theme tokens live in `src/scenes/scenes.css`, applied via `data-scene` on `.os-root`. Current themes are `win98` and `win98-dark` (`ThemeId` in `src/os/types.ts`; `SceneId` is a back-compat alias). Switch via the Settings app.

### Auth — Auth.js (NextAuth v5 beta, JWT)
`src/auth.ts` configures a Credentials provider (email + bcrypt password hash) with `session.strategy: 'jwt'`; the JWT carries `user.id` into the session. `src/components/AuthGate.tsx` is a client gate that redirects unauthenticated users to `/auth/signin`. Signup (`/api/auth/signup`) creates the user **and seeds their filesystem** (`seedFileSystemForUser`). `src/types/next-auth.d.ts` augments the session type with `user.id`.

### Data layer — Drizzle ORM + Postgres
Schema: `src/db/schema.ts` (the source of truth for queries and types). Client: `src/db/index.ts` (single pooled `pg` connection, reused across hot-reloads via a global).

**Migrations are applied by hand, not by Drizzle.** `drizzle-kit` is installed and `drizzle.config.ts` exists, but nothing has ever been generated — there is no `drizzle/` directory and no `generate`/`push`/`migrate` script. The actual DB changes live as hand-written **idempotent** SQL in `sql/` (`phase1-bkos.sql`, `add-closed-to-notes.sql`), using `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so they're safe to re-run. **When you change `schema.ts`, write a matching idempotent SQL script in `sql/` and run it against the DB manually** (e.g. `psql "$DATABASE_URL" -f sql/your-change.sql`). `drizzle-kit push` would technically sync the schema, but it is not the workflow this repo uses — prefer the SQL scripts so the change is reviewable and reproducible.

Tables: Auth.js standard set (`user`, `account`, `session`, `verification_token`) plus app tables `notes`, `fs_nodes`, `bookmarks`. **All app data is scoped by `userId`** — every query must filter on it.

### The DB-backed filesystem (`fs_nodes` + `src/lib/fs-server.ts`)
The real, persistent filesystem. Each row is a file or folder; folders nest via `parentId` (root has `parentId = null`). Text files store content inline in `textContent`; binary files store bytes on disk under `BKOS_BLOB_DIR` keyed by `blobRef` (see `writeBlob`/`readBlob`/`deleteBlob`). Deletes are **soft** (`recycled` + `recycledFromParentId`) — the Recycle Bin restores from there; perma-delete removes rows and blobs. Seeded system folders have `isSystem: true` and can be renamed but not deleted. `seedFileSystemForUser` is idempotent and race-safe via a Postgres advisory lock.

`fs-server.ts` is server-only (uses `node:fs`). The client reaches it through `/api/fs/*` routes; `src/hooks/useFs.ts` wraps those. **Do not confuse this with `src/os/vfs.ts`**, which is a separate legacy hardcoded in-memory tree still referenced by some apps.

### Routing — App Router + one Pages Router exception
Everything lives under `src/app/` (App Router) **except WebDAV**: `src/pages/api/webdav/[[...path]].ts` is in the **Pages Router** because App Router route handlers can't dispatch non-standard HTTP methods (PROPFIND, PROPPATCH, MKCOL, MOVE, COPY, LOCK). It mounts the user's home directory at the WebDAV root and uses `fs-server.ts` under the hood. `bodyParser` is disabled there to stream PUT bodies.

### Docker / Infrastructure app
`src/lib/docker.ts` talks to the Docker Engine API over the Unix socket directly via `node:http` (`socketPath`), no SDK. The Infrastructure app (`src/apps/InfrastructureApp.tsx` + `infrastructure/ContainersTab.tsx`) lists containers, streams logs/stats, and runs start/stop/restart actions through `/api/infra/*`.

#### Docker socket — mount + group (now PERSISTENT across redeploys)
The Containers tab needs `/var/run/docker.sock` mounted into the bailey-os container, and the (non-root `nextjs`, uid 1001) container user must be in the host's `docker` group to read it (`root:docker`, mode 0660). Dokploy manages the Swarm service spec and **wipes ad-hoc `docker service update` flags on every redeploy**, so neither piece can rely on `docker service update`.

Both pieces are now baked in so they survive redeploys — **no manual re-apply needed**:
1. **Mount** — a `bind` mount `/var/run/docker.sock → /var/run/docker.sock` lives in Dokploy's own config (a row in the `mount` table of the `dokploy` Postgres DB, `applicationId='_svNEGEELmPAgNpGBNmcF'`). Dokploy emits it into the service spec on every deploy. To edit it the supported way: Dokploy UI → bailey-os → Advanced → Volumes/Mounts.
2. **Group** — the `Dockerfile` adds `nextjs` to a group with GID **989** (`addgroup --system --gid 989 dockerhost && addgroup nextjs dockerhost`). Image-level group membership grants socket access without `--group-add`. (GID 989 is the host's `docker` group on this mini PC — if the host changes, update this.)

Facts for this host (mini PC):
- Service name: `baileyos-bkos-chcncm` · App id in Dokploy: `_svNEGEELmPAgNpGBNmcF`
- Host socket: `/run/docker.sock` (symlinked at `/var/run/docker.sock`), owned `root:docker`, GID **989**

Verify after a deploy (no manual step should be needed):
```bash
docker service inspect baileyos-bkos-chcncm --format '{{json .Spec.TaskTemplate.ContainerSpec.Mounts}}'   # includes docker.sock
docker exec $(docker ps -q --filter name=baileyos-bkos) sh -c 'id; ls -la /var/run/docker.sock'           # nextjs in group 989; socket present
```
Emergency fallback (if the above ever regresses — e.g. host docker GID changed): re-add ad-hoc with `docker service update --mount-add type=bind,source=/run/docker.sock,target=/var/run/docker.sock --group-add 989 baileyos-bkos-chcncm` (~30s rolling restart). `src/lib/docker.ts` logs the raw socket error to the server logs (visible in Dokploy) when this is missing.

## Conventions

- Path alias: `@/*` → `src/*`.
- Server-only modules (`fs-server.ts`, `docker.ts`, `auth.ts`, `db/`) must never be imported into client components — keep them behind API routes or server components.
- Component files use a Win98 aesthetic: inline styles and `MS Sans Serif` font stacks are normal here, not a smell.
- Icons are an inline-SVG set in `src/components/Icon.tsx` / `src/os/appIcons.tsx` (no icon library dependency).
