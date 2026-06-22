# BK-OS Phase 1 — what's new and how to migrate

Phase 1 shifts bailey.os into "BK-OS" the platform. Big changes:

- **Server-side file system** — files & folders persist to Postgres + blob storage on disk
- **Plugin manifest architecture** — apps declare origin/visibility/category
- **Public/private mode** — single codebase, two deployments (public demo + your private real one)
- **Theme cleanup** — only Win98 + Win98-at-Night remain
- **Command palette (Ctrl+K)** — fuzzy find apps, files, notes, commands
- **System tray** — clock, theme toggle, lock, palette launch
- **Universal search** in launcher — apps + files + notes

## Required steps to deploy

### 1. Run the SQL migration

```bash
# On bkos via SSH
psql $DATABASE_URL -f /path/to/sql/phase1-bkos.sql
```

This adds:
- `fs_nodes` — the new file system table
- `bookmarks` — for the Internet Explorer app
- `is_guest` flag on the `user` table

Safe to run on production; all changes use `IF NOT EXISTS`.

### 2. Create the blob storage directory

```bash
sudo mkdir -p /data/blobs
sudo chown -R 1000:1000 /data/blobs    # adjust to your container user
```

Mount this into Dokploy when redeploying — under the bailey-os service → **Volumes** tab:
- **Source**: `/data/blobs`
- **Target**: `/data/blobs`
- Type: bind mount

Or override the path with the `BKOS_BLOB_DIR` env var if you want it elsewhere.

### 3. Set environment variables

Add to bailey-os service environment in Dokploy:

```
BKOS_MODE=private
BKOS_BLOB_DIR=/data/blobs
```

For a public demo deployment (separate service), set `BKOS_MODE=public`.

### 4. Deploy

Push the new code → Dokploy auto-deploys. First load after deploy will trigger DB seed for your account (it's idempotent, safe).

## Architecture changes

### File system

**Before**: `vfsAdditions` slice in Zustand (browser localStorage). Hardcoded `VFS_ROOT` in `src/os/vfs.ts`.

**After**: `fs_nodes` table in Postgres. The new `Explorer.tsx` reads from `/api/fs/*`. The old `Explorer.old.tsx.bak` is preserved for reference but not compiled.

The old `vfsAdditions` slice and `fileContents` slice are *still in the store* — they're used by:
- `DesktopIcons.tsx` (desktop shortcuts — to be migrated in Phase 1.5)
- `DockSearch.tsx` (legacy search; superseded by the universal search in Launcher)
- `TerminalApp.tsx` (uses `VFS_ROOT` for `ls` commands)

These won't break, but they're operating on a duplicate dataset. Eventually they migrate to the server fs too.

### Plugin manifest

`src/os/appsMeta.ts` now has rich manifest fields:

```ts
{
  id: "projects",
  name: "Projects",
  // ...
  origin: "addon-native",         // builtin | addon-native | addon-external
  visibility: "private",          // public | private | both
  category: "development",        // groups in Start Menu
  description: "...",
  commands: [...],                // contributes to Ctrl+K
}
```

`visibleApps('public' | 'private')` returns filtered apps for the current mode. The Launcher and Command Palette respect this automatically.

### Modes

- **Private mode** (default): all apps visible, normal auth flow, real data
- **Public mode**: only `visibility: 'public' | 'both'` apps shown, banner at top, future: auto-create guest accounts for sandbox demo

Set `BKOS_MODE` on each deployment. `next.config.mjs` mirrors it to `NEXT_PUBLIC_BKOS_MODE` for the client.

### Themes

`src/os/types.ts` defines `ThemeId = 'win98' | 'win98-dark'`. The old `SceneId` is aliased for compat.

CSS:
- `:root` now contains Win98 defaults (so the OS renders correctly even without `data-scene` set)
- `[data-scene="win98"]` — explicit Win98 (redundant but kept for clarity)
- `[data-scene="win98-dark"]` — nighttime variant

Settings app reduced to a 2-card picker.

## New files

```
src/lib/fs-server.ts         — server-side file system + blob storage
src/lib/mode.ts              — BKOS_MODE detection
src/hooks/useFs.ts           — client fs hook + mutation helpers
src/components/CommandPalette.tsx
src/components/SystemTray.tsx
src/components/PublicBanner.tsx
src/app/api/fs/list/route.ts
src/app/api/fs/create/route.ts
src/app/api/fs/[id]/route.ts
src/app/api/fs/[id]/restore/route.ts
src/app/api/fs/blob/[id]/route.ts
src/app/api/search/route.ts
sql/phase1-bkos.sql
```

## Refactored files

```
src/db/schema.ts             — added fs_nodes, bookmarks, isGuest
src/os/types.ts              — ThemeId, expanded AppManifest
src/os/appsMeta.ts           — full manifest for every app + visibility filtering
src/apps/SettingsApp.tsx     — Win98/Win98-Dark toggle only
src/apps/NotepadApp.tsx      — server-fs backed
src/apps/RecycleBinApp.tsx   — reads from server recycle
src/components/Explorer.tsx  — REWRITTEN: server-fs backed
src/components/FsIcons.tsx   — accepts new file kinds
src/components/Icon.tsx      — added sun/moon/globe/command
src/components/Launcher.tsx  — universal search hookup
src/components/Dock.tsx      — system tray slot
src/components/DesktopShell.tsx — wires command palette
src/scenes/scenes.css        — themes trimmed + new component styles
src/app/layout.tsx           — public banner + mode-aware metadata
src/app/api/auth/signup/route.ts — seeds file system for new user
next.config.mjs              — BKOS_MODE mirror, skip TS errors
```

## Known limitations of Phase 1

- **DesktopIcons not migrated** — desktop folder contents render from old client state, not from server fs. New files created in `Desktop/` via the new Explorer won't show up as desktop icons until Phase 1.5.
- **Notepad open contract** — when opened via the new Explorer, `notepadInitial.path[0]` is the fs node id (a UUID). The old DesktopIcons still passes a path array; opening a desktop text file via double-click will not find content. Workaround: open via My Computer.
- **No drag-and-drop between Explorer windows yet** — works within a folder via right-click only.
- **Address bar manual edit doesn't navigate** — display-only for now. Use back/forward/up + double-click.
- **Old Explorer features not ported**: tree view in left pane, multi-select, copy/cut clipboard for files (only app shortcuts still work).

These all roll into Phase 1.5 (a polish pass after first deploy).

## Phase 2 sketch (the Projects app)

Now that the platform is real, the Projects app becomes a native addon that lives at `src/apps/ProjectsApp.tsx`. It uses the file system: each project is a folder under `C:/Users/Bailey/Projects/<name>/` with conventional subfolders (`tasks/`, `docs/`, `links.json`, etc.). The app provides a curated view on top of those folders.

This is the architecturally elegant outcome: **every app is just a view onto your file system**.
