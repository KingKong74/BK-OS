# BK-OS Phase 3 — WebDAV adapter + Infrastructure/Status app

## What's new

### 1. WebDAV adapter
Mount your BK-OS file system as a network drive from any OS.
- **Endpoint**: `https://os.bkos.dev/api/webdav/`
- **Auth**: HTTP Basic with your BK-OS email + password
- **Methods**: GET, HEAD, PUT, DELETE, MKCOL, MOVE, PROPFIND, OPTIONS, LOCK/UNLOCK (faked for Windows compat)

### 2. Infrastructure / Status app
A native addon at "Infrastructure" in the app launcher.
- **Status tab**: live health of DB, file system, blob storage, env vars, GitHub connectivity. Auto-refreshes every 30s. Each failed check comes with a suggested fix.
- **Diagnose tab**: paste an error / stack trace, Claude API explains what's wrong and how to fix it.
- **WebDAV tab**: copyable URL + mount instructions for Windows/macOS/Linux.

## Required deploy steps

### 1. Set the Anthropic API key (for the Diagnose feature)

Get a key at <https://console.anthropic.com>.

In Dokploy → bailey-os service → **Environment** tab, add:

```
ANTHROPIC_API_KEY=sk-ant-...
```

If you skip this, the Diagnose tab will show a "not configured" message; the Status tab still works.

### 2. Deploy

```bash
cd /c/bailey-os
# Extract the phase 3 zip over the existing repo
git status
git add .
git commit -m "Phase 3: WebDAV adapter + Infrastructure/Status app"
git push
```

Dokploy auto-deploys.

### 3. Test the Infrastructure app

After deploy:
1. Visit `os.bkos.dev` → log in
2. Open **Infrastructure** from the start menu
3. **Status** tab — should show 5 checks, all green if everything's healthy
4. **Diagnose** tab — paste a sample error like:
   ```
   Error: getaddrinfo ENOTFOUND baileyos-postgres-ndwjiw.1.xyz
   ```
   Click **Diagnose** — Claude should explain the DNS issue and recommend the daemon.json fix.
5. **WebDAV** tab — see your mount URL with platform-specific instructions

### 4. Test the WebDAV mount

**On Windows:**
1. File Explorer → right-click **This PC** → **Map network drive**
2. Drive letter: pick any (e.g. Z:)
3. Folder: paste `https://os.bkos.dev/api/webdav/`
4. Check **Connect using different credentials**
5. Username: your BK-OS email. Password: your BK-OS password.
6. The mapped drive should appear in File Explorer with `C:`, `Users`, etc. visible
7. Open `C:/Users/Bailey/Documents/`, create a file via Windows Explorer
8. Refresh BK-OS My Computer — the file is there

**On macOS:**
1. Finder → **Go** → **Connect to Server** (⌘K)
2. Paste `https://os.bkos.dev/api/webdav/`
3. Sign in with BK-OS email + password
4. A new drive should appear in Finder

**Quick CLI test (curl):**
```bash
# PROPFIND root with Basic auth
curl -X PROPFIND -u 'your-email@example.com:yourpassword' \
  https://os.bkos.dev/api/webdav/ \
  -H "Depth: 1"
```

Should return an XML multistatus document listing your top-level items.

## Architecture notes

### WebDAV URL → fs_node mapping

```
/api/webdav/                      → root (parent_id IS NULL)
/api/webdav/C:/                   → "C:" folder
/api/webdav/C:/Users/Bailey/      → walks down by name
/api/webdav/C:/.../docs/notes.md  → individual file
```

URL segments are percent-decoded then matched to `fs_nodes.name` in order, scoped to the authenticated user.

### Text vs blob storage

When you PUT a file, the adapter looks at:
- The HTTP `Content-Type` header
- The filename extension

If either signals text (md, txt, json, js, ts, csv, log, env, html, css, yaml, toml), the body is stored in `fs_nodes.text_content`. Otherwise it goes through `writeBlob()` into `/data/blobs` and only the blob ref is stored.

That means if `/data/blobs` isn't mounted (Dokploy didn't give you a Volumes tab), text files still work — but binary uploads fail.

### Windows quirks

Windows' WebDAV client is fussy:
- Requires Basic auth (we support this)
- Wants `DAV: 1, 2` in OPTIONS response (we return this)
- Expects `LOCK` to actually work (we fake-implement it — returns a fake lock token)
- Some Windows versions need `BasicAuthLevel=2` in the registry to allow Basic auth over HTTPS. If mounting fails silently:
  ```
  HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WebClient\Parameters
    BasicAuthLevel = 2 (DWORD)
  ```
  Then restart the WebClient service.

## Known limitations

- **No COPY method yet** — drag-and-copy in file managers will fail. MOVE works.
- **Locks are faked** — no real concurrency protection. Two clients writing the same file at the same time → last write wins.
- **No app-specific passwords** — uses your main login password. Treat the URL accordingly. Future Phase: generate revocable WebDAV-only tokens.
- **DELETE goes to Recycle Bin, not permadelete** — same as the web UI's delete behavior. To purge, use the Recycle Bin app.
- **AI diagnosis costs API tokens** — every diagnose request hits the Anthropic API. Each query uses ~1-3k tokens.

## Files added in Phase 3

```
src/lib/webdav.ts                                   — auth + XML helpers
src/app/api/webdav/[[...path]]/route.ts             — catch-all WebDAV handler
src/lib/infra.ts                                    — server-side status checks
src/app/api/infra/status/route.ts                   — status endpoint
src/app/api/infra/diagnose/route.ts                 — Claude API proxy
src/apps/InfrastructureApp.tsx                      — Status / Diagnose / WebDAV tabs
PHASE-3-MIGRATION.md                                — this doc
```

## What's next (Phase 4 ideas)

- **Docker socket integration** — read real container health, restart services from BK-OS
- **App-specific WebDAV passwords** — separate revocable tokens for sync clients
- **Pre-canned diagnoses** — the Status tab's "suggested fix" hints become clickable, automated fixes (e.g. "Restart Docker" button)
- **Inbox** — aggregated recent errors with one-click diagnose
- **Per-project GitHub commit feed** — pull recent commits into the Projects app
- **Per-project Dokploy deploy status** — see latest build status inline
