"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APPS, visibleApps } from "@/os/appsMeta";
import type { AppCategory } from "@/os/types";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";
import { searchAll } from "@/hooks/useFs";
import { getClientMode } from "@/lib/mode";
import UserStatusBar from '@/components/UserStatusBar';

// Apps prominently shown in the "Pinned" row.
const PINNED_IDS = ["mycomputer", "moniqr", "claude", "notepad", "settings", "projects"];

// Category sections for the "all apps" area, in Start-menu order.
const CATEGORY_ORDER: AppCategory[] = [
  "system", "productivity", "development", "infrastructure", "media", "finance", "games",
];
const CATEGORY_LABELS: Record<AppCategory, string> = {
  system: "System",
  productivity: "Productivity",
  development: "Development",
  infrastructure: "Infrastructure",
  media: "Media",
  finance: "Finance",
  games: "Games",
};

export function Launcher() {
  const openApp = useOS((s) => s.openApp);
  const launcherStyle = useOS((s) => s.launcherStyle);
  const toggleLauncher = useOS((s) => s.toggleLauncher);
  const addDesktopShortcut = useOS((s) => s.addDesktopShortcut);
  const setVaultInitialPath = useOS((s) => s.setVaultInitialPath);
  const lock = useOS((s) => s.lock);
  const sleep = useOS((s) => s.sleep);
  const restart = useOS((s) => s.restart);
  const shutdown = useOS((s) => s.shutdown);

  const [q, setQ] = useState("");
  const [serverResults, setServerResults] = useState<{
    files: Array<{ id: string; name: string; type: string; kind: string; parentId: string | null }>;
    notes: Array<{ id: string; title: string | null; preview: string }>;
  }>({ files: [], notes: [] });
  const [powerOpen, setPowerOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const mode = getClientMode();

  const searching = q.trim().length > 0;
  const visible = visibleApps(mode);
  const results = visible.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pinnedApps = PINNED_IDS
    .map((id) => visible.find((a) => a.id === id))
    .filter(Boolean) as typeof APPS;
  const otherApps = [...visible]
    .filter((a) => !PINNED_IDS.includes(a.id) && a.showInLauncher !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
  // Group the remaining apps by category for the sectioned "all apps" view.
  const groupedApps = CATEGORY_ORDER
    .map((cat) => ({ cat, apps: otherApps.filter((a) => a.category === cat) }))
    .filter((g) => g.apps.length > 0);

  // Debounced server search
  useEffect(() => {
    if (!searching) { setServerResults({ files: [], notes: [] }); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(q);
        if (!cancelled) setServerResults(r);
      } catch { /* ignore */ }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, searching]);
  const close = () => toggleLauncher(false);
  const openAt = (path: string[]) => { setVaultInitialPath(path); openApp("mycomputer"); close(); };

  // Close cleanly when clicking anywhere outside the panel, or on Escape.
  // The listener is attached on the next tick so the click that *opened* the
  // launcher doesn't immediately close it. Clicks on the Start button fall
  // through to its own toggle handler.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (launcherRef.current?.contains(target)) {
        // Clicking elsewhere inside the panel dismisses the power popup.
        if (!target.closest(".launcher-power-wrapper")) setPowerOpen(false);
        return;
      }
      if (target.closest(".dock-launcher")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown, true), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doLock = () => { close(); lock(); };
  const doSleep = () => { close(); sleep(); };
  const doShutdown = () => { close(); shutdown(); };
  const doRestart = () => { close(); restart(); };

  // Native HTML5 drag of an app tile onto the desktop → creates a shortcut.
  const onTileDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("application/x-bailey-app", id);
    e.dataTransfer.effectAllowed = "copy";
    setDragId(id);
  };

  // Drop handling lives on the overlay: while the launcher is open it covers
  // the whole screen, so a drop "on the desktop" lands on the overlay backdrop
  // (outside the panel). Dropping on the panel or over the dock cancels.
  const onOverlayDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-bailey-app")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onOverlayDrop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData("application/x-bailey-app");
    setDragId(null);
    if (!id) return;
    e.preventDefault();
    if ((e.target as HTMLElement).closest(".launcher")) return; // on the panel → cancel
    const dock = document.querySelector(".dock");
    if (dock) {
      const r = dock.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return; // on the dock → cancel
    }
    addDesktopShortcut(id, e.clientX - 36, e.clientY - 36);
    close();
  };

  const Tile = ({ id }: { id: string }) => {
    const meta = APPS.find((a) => a.id === id);
    if (!meta) return null;
    return (
      <button
        className={"launcher-app" + (dragId === id ? " is-dragging" : "")}
        draggable
        onDragStart={(e) => onTileDragStart(e, id)}
        onDragEnd={() => setDragId(null)}
        onClick={() => { openApp(id); close(); }}
      >
        <span className="launcher-tile">
          <AppIcon id={id} size={32} />
        </span>
        <span className="launcher-name">{meta.name}</span>
      </button>
    );
  };

  return (
    <div
      className="launcher-overlay"
      data-launcher={launcherStyle}
      onClick={close}
      onDragOver={onOverlayDragOver}
      onDrop={onOverlayDrop}
    >
      <div
        ref={launcherRef}
        className="launcher"
        data-launcher={launcherStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="launcher-main">
          <div className="launcher-search">
            <Icon name="search" size={17} />
            <input
              autoFocus
              placeholder="Search apps and files"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) { openApp(results[0].id); close(); }
                if (e.key === "Escape") close();
              }}
            />
          </div>

          <div className="launcher-content">
            {searching ? (
              <>
                {results.length > 0 && (
                  <>
                    <div className="launcher-section-label">Apps <span className="launcher-section-count">{results.length}</span></div>
                    <div className="launcher-grid">
                      {results.map((a) => <Tile key={a.id} id={a.id} />)}
                    </div>
                  </>
                )}
                {serverResults.files.length > 0 && (
                  <>
                    <div className="launcher-section-label launcher-section-label-spaced">
                      Files <span className="launcher-section-count">{serverResults.files.length}</span>
                    </div>
                    <div className="launcher-search-list">
                      {serverResults.files.slice(0, 8).map((f) => (
                        <button
                          key={f.id}
                          className="launcher-search-row"
                          onClick={() => { openApp("mycomputer"); close(); }}
                          title={f.name}
                        >
                          <Icon name={f.type === "folder" ? "folder" : "file"} size={16} />
                          <span className="launcher-search-row-label">{f.name}</span>
                          <span className="launcher-search-row-kind">{f.type === "folder" ? "Folder" : f.kind}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {serverResults.notes.length > 0 && (
                  <>
                    <div className="launcher-section-label launcher-section-label-spaced">
                      Notes <span className="launcher-section-count">{serverResults.notes.length}</span>
                    </div>
                    <div className="launcher-search-list">
                      {serverResults.notes.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          className="launcher-search-row"
                          onClick={() => { useOS.getState().openNote(n.id); openApp("notes"); close(); }}
                        >
                          <Icon name="notes" size={16} />
                          <span className="launcher-search-row-label">{n.title || n.preview.slice(0, 40)}</span>
                          <span className="launcher-search-row-kind">Post-it</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {results.length === 0 && serverResults.files.length === 0 && serverResults.notes.length === 0 && (
                  <div className="launcher-empty">
                    <Icon name="search" size={28} />
                    <p className="launcher-empty-title">Nothing found</p>
                    <p className="launcher-empty-sub">No apps, files, or notes match &ldquo;{q}&rdquo;.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="launcher-section-label">Pinned</div>
                <div className="launcher-grid">
                  {pinnedApps.map((a) => <Tile key={a.id} id={a.id} />)}
                </div>
                {groupedApps.map(({ cat, apps }) => (
                  <Fragment key={cat}>
                    <div className="launcher-section-label launcher-section-label-spaced">
                      {CATEGORY_LABELS[cat]}
                    </div>
                    <div className="launcher-grid">
                      {apps.map((a) => <Tile key={a.id} id={a.id} />)}
                    </div>
                  </Fragment>
                ))}
              </>
            )}
          </div>
          <UserStatusBar />
          <div className="launcher-footer">
            <div className="launcher-footer-actions">
              <div className="launcher-power-wrapper">
                {powerOpen && (
                  <div className="launcher-power-pop">
                    <button onClick={doLock}><Icon name="lock" size={14} /> Lock</button>
                    <button onClick={doSleep}><Icon name="lock" size={14} /> Sleep</button>
                    <button onClick={doShutdown}><Icon name="power" size={14} /> Shut down</button>
                    <button onClick={doRestart}><Icon name="refresh" size={14} /> Restart</button>
                  </div>
                )}
                <button
                  className={"launcher-fb" + (powerOpen ? " is-active" : "")}
                  title="Power"
                  onClick={() => setPowerOpen((p) => !p)}
                >
                  <Icon name="power" size={16} />
                </button>
              </div>
              <button className="launcher-fb" title="Settings" onClick={() => { close(); openApp("settings"); }}>
                <Icon name="settings" size={16} />
              </button>
              <button className="launcher-fb" title="Pictures" onClick={() => openAt(["C:", "Users", "Bailey", "Pictures"])}>
                <Icon name="photo" size={16} />
              </button>
              <button className="launcher-fb" title="Documents" onClick={() => openAt(["C:", "Users", "Bailey", "Documents"])}>
                <Icon name="folder" size={16} />
              </button>
              <button className="launcher-fb launcher-fb-profile" title="Bailey">
                <svg viewBox="0 0 16 16" width="20" height="20" shapeRendering="crispEdges">
                  {/* hair */}
                  <path fill="#5a3416" d="M5 2h6v1H5zM4 3h8v1H4zM3 4h10v2H3z" />
                  {/* face */}
                  <path fill="#f4c89e" d="M5 4h6v1H5zM4 5h8v3H4zM5 8h6v1H5z" />
                  {/* eyes */}
                  <rect x="6" y="6" width="1" height="1" fill="#000" />
                  <rect x="9" y="6" width="1" height="1" fill="#000" />
                  {/* mouth */}
                  <rect x="7" y="8" width="2" height="1" fill="#7a3a3a" />
                  {/* shirt */}
                  <path fill="#3e6db8" d="M4 10h8v1H4zM3 11h10v1H3zM2 12h12v4H2z" />
                  {/* collar */}
                  <path fill="#f4c89e" d="M6 9h4v1H6z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
