"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APPS, visibleApps } from "@/os/appsMeta";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";
import { searchAll } from "@/hooks/useFs";
import { getClientMode } from "@/lib/mode";

interface PaletteItem {
  id: string;
  group: "Apps" | "Commands" | "Files" | "Notes";
  label: string;
  sub?: string;
  appId?: string;
  iconName?: string;
  action: () => void;
}

export function CommandPalette() {
  const open = useOS((s) => s.commandPaletteOpen);
  const setOpen = useOS((s) => s.setCommandPaletteOpen);
  const openApp = useOS((s) => s.openApp);
  const setScene = useOS((s) => s.setScene);
  const scene = useOS((s) => s.scene);
  const addNote = useOS((s) => s.addNote);
  const lock = useOS((s) => s.lock);
  const shutdown = useOS((s) => s.shutdown);

  const [q, setQ] = useState("");
  const [serverResults, setServerResults] = useState<{
    files: Array<{ id: string; name: string; type: string; kind: string; parentId: string | null }>;
    notes: Array<{ id: string; title: string | null; preview: string }>;
  }>({ files: [], notes: [] });
  const [selIdx, setSelIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mode = getClientMode();

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQ("");
      setSelIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced server search for files + notes
  useEffect(() => {
    if (!open || !q.trim()) { setServerResults({ files: [], notes: [] }); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(q);
        if (!cancelled) setServerResults(r);
      } catch { /* ignore */ }
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  // Build items list. Re-derives on q change.
  const items: PaletteItem[] = useMemo(() => {
    const visible = visibleApps(mode);
    const Q = q.trim().toLowerCase();

    const appItems: PaletteItem[] = visible
      .filter((a) => {
        if (!Q) return true;
        if (a.name.toLowerCase().includes(Q)) return true;
        if (a.id.toLowerCase().includes(Q)) return true;
        return false;
      })
      .slice(0, 8)
      .map((a) => ({
        id: `app:${a.id}`,
        group: "Apps",
        label: a.name,
        sub: a.description,
        appId: a.id,
        action: () => { openApp(a.id); setOpen(false); },
      }));

    // System-wide commands
    const builtins: PaletteItem[] = ([
      {
        id: "cmd:new-note", group: "Commands" as const, label: "New Post-it note",
        iconName: "notes",
        action: () => { addNote(); setOpen(false); },
      },
      {
        id: "cmd:toggle-theme", group: "Commands" as const,
        label: scene === "win98" ? "Switch to Win98 at Night" : "Switch to Retro 98",
        iconName: scene === "win98" ? "moon" : "sun",
        action: () => { setScene(scene === "win98" ? "win98-dark" : "win98"); setOpen(false); },
      },
      { id: "cmd:lock", group: "Commands" as const, label: "Lock BK-OS", iconName: "lock", action: () => { lock(); setOpen(false); } },
      { id: "cmd:shutdown", group: "Commands" as const, label: "Shut down", iconName: "power", action: () => { shutdown(); setOpen(false); } },
    ] as PaletteItem[]).filter((it) => !Q || it.label.toLowerCase().includes(Q));

    const fileItems: PaletteItem[] = serverResults.files.map((f) => ({
      id: `file:${f.id}`,
      group: "Files",
      label: f.name,
      sub: f.type === "folder" ? "Folder" : `${f.kind} file`,
      iconName: f.type === "folder" ? "folder" : "file",
      action: () => {
        // Open in My Computer with parent path resolved client-side later
        useOS.getState().setVaultInitialPath(null);
        openApp("mycomputer");
        // We don't navigate-to-parent yet, that needs more wiring
        setOpen(false);
      },
    }));

    const noteItems: PaletteItem[] = serverResults.notes.map((n) => ({
      id: `note:${n.id}`,
      group: "Notes",
      label: n.title || n.preview.slice(0, 50) || "(untitled note)",
      sub: n.preview.slice(0, 80),
      iconName: "notes",
      action: () => {
        useOS.getState().openNote(n.id);
        openApp("notes");
        setOpen(false);
      },
    }));

    return [...appItems, ...builtins, ...fileItems, ...noteItems];
  }, [q, mode, scene, openApp, setOpen, setScene, addNote, lock, shutdown, serverResults]);

  // Reset selection when items change
  useEffect(() => {
    setSelIdx((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  // Group items for display
  const groups: Array<{ title: string; items: PaletteItem[] }> = [];
  for (const grp of ["Apps", "Commands", "Files", "Notes"] as const) {
    const xs = items.filter((it) => it.group === grp);
    if (xs.length > 0) groups.push({ title: grp, items: xs });
  }

  return (
    <div className="cmd-palette-overlay" onMouseDown={() => setOpen(false)}>
      <div className="cmd-palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmd-palette-titlebar">
          <span className="cmd-palette-title">Run command…</span>
          <button className="cmd-palette-close" onClick={() => setOpen(false)} aria-label="Close">
            <Icon name="close" size={12} />
          </button>
        </div>
        <div className="cmd-palette-body">
          <div className="cmd-palette-input-row">
            <Icon name="search" size={16} />
            <input
              ref={inputRef}
              placeholder="Type to search apps, files, notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelIdx((i) => Math.min(i + 1, items.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  items[selIdx]?.action();
                }
              }}
            />
            <span className="cmd-palette-hint">Esc to close</span>
          </div>
          <div className="cmd-palette-list">
            {groups.length === 0 && (
              <div className="cmd-palette-empty">
                {q ? `No matches for "${q}"` : "Start typing…"}
              </div>
            )}
            {groups.map((g) => {
              return (
                <div key={g.title} className="cmd-palette-group">
                  <div className="cmd-palette-group-label">{g.title}</div>
                  {g.items.map((it) => {
                    const absIdx = items.indexOf(it);
                    const isSel = absIdx === selIdx;
                    return (
                      <button
                        key={it.id}
                        className={"cmd-palette-item" + (isSel ? " is-sel" : "")}
                        onMouseEnter={() => setSelIdx(absIdx)}
                        onClick={() => it.action()}
                      >
                        <span className="cmd-palette-icon">
                          {it.appId ? <AppIcon id={it.appId} size={18} /> : it.iconName ? <Icon name={it.iconName as Parameters<typeof Icon>[0]["name"]} size={16} /> : null}
                        </span>
                        <span className="cmd-palette-label-col">
                          <span className="cmd-palette-label">{it.label}</span>
                          {it.sub && <span className="cmd-palette-sub">{it.sub}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="cmd-palette-footer">
            <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
