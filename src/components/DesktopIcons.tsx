"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { MENUBAR_H } from "@/os/types";
import { AppIcon } from "./AppIcon";
import { FolderImg, FileImg } from "./FsIcons";
import {
  resolvePath,
  useFsChildren,
  renameFsNode,
  deleteFsNode,
  type FsNodeDTO,
} from "@/hooks/useFs";

const CELL_W = 88;
const CELL_H = 98;
const ORIGIN_X = 16;
const ORIGIN_Y = MENUBAR_H + 14;

export const DESKTOP_PATH = ["C:", "Users", "Bailey", "Desktop"];
const DESKTOP_PATH_KEY = DESKTOP_PATH.join("/");

// Horizontal flow: place icons left-to-right in rows, wrapping to the next
// row at the right edge of the desktop (macOS-Stacks-style, not a column).
function iconsPerRow() {
  if (typeof window === "undefined") return 8;
  return Math.max(1, Math.floor((window.innerWidth - ORIGIN_X * 2) / CELL_W));
}
function defaultPos(index: number) {
  const perRow = iconsPerRow();
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  return { x: ORIGIN_X + col * CELL_W, y: ORIGIN_Y + row * CELL_H };
}
function cellOf(p: { x: number; y: number }) {
  return {
    col: Math.max(0, Math.round((p.x - ORIGIN_X) / CELL_W)),
    row: Math.max(0, Math.round((p.y - ORIGIN_Y) / CELL_H)),
  };
}
function posOf(cell: { col: number; row: number }) {
  return { x: ORIGIN_X + cell.col * CELL_W, y: ORIGIN_Y + cell.row * CELL_H };
}
function clampCell(c: { col: number; row: number }) {
  let { col, row } = c;
  if (typeof window !== "undefined") {
    const maxCol = Math.max(0, Math.floor((window.innerWidth - 90 - ORIGIN_X) / CELL_W));
    const maxRow = Math.max(0, Math.floor((window.innerHeight - 130 - ORIGIN_Y) / CELL_H));
    col = Math.min(col, maxCol);
    row = Math.min(row, maxRow);
  }
  return { col: Math.max(0, col), row: Math.max(0, row) };
}
function findFreeCell(target: { col: number; row: number }, occupied: { col: number; row: number }[]) {
  const taken = (c: number, r: number) => occupied.some((o) => o.col === c && o.row === r);
  if (!taken(target.col, target.row)) return target;
  for (let d = 1; d <= 12; d++) {
    for (const [dc, dr] of [[0, d], [0, -d], [d, 0], [-d, 0], [d, d], [-d, d], [d, -d], [-d, -d]]) {
      const col = target.col + dc;
      const row = target.row + dr;
      if (col >= 0 && row >= 0 && !taken(col, row)) return clampCell({ col, row });
    }
  }
  return target;
}

// Merged item — either a system app shortcut, a real folder, or a real file on the desktop.
type Item =
  | { kind: "app"; id: string; appId: string; label: string }
  | { kind: "folder"; id: string; serverId: string; name: string; label: string }
  | { kind: "file"; id: string; serverId: string; name: string; fileKind: string; label: string };

export function DesktopIcons() {
  const openApp = useOS((s) => s.openApp);
  const openMenu = useOS((s) => s.openMenu);
  const iconPositions = useOS((s) => s.iconPositions);
  const setIconPosition = useOS((s) => s.setIconPosition);
  const gridSnap = useOS((s) => s.gridSnap);
  const desktopShortcuts = useOS((s) => s.desktopShortcuts);
  const removeDesktopShortcut = useOS((s) => s.removeDesktopShortcut);
  const renameDesktopShortcut = useOS((s) => s.renameDesktopShortcut);
  const addDesktopShortcut = useOS((s) => s.addDesktopShortcut);
  const vfsAdditions = useOS((s) => s.vfsAdditions);
  const removeVfsNode = useOS((s) => s.removeVfsNode);
  const pathLabels = useOS((s) => s.pathLabels);
  const setPathLabel = useOS((s) => s.setPathLabel);
  const setVaultInitialPath = useOS((s) => s.setVaultInitialPath);
  const requestOpenInNotepad = useOS((s) => s.requestOpenInNotepad);
  const clipboard = useOS((s) => s.clipboard);
  const setClipboard = useOS((s) => s.setClipboard);

  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [desktopFolderId, setDesktopFolderId] = useState<string | null | undefined>(undefined);

  // Resolve the Desktop folder id from the server fs on mount.
  useEffect(() => {
    let alive = true;
    resolvePath(["C:", "Users", "Bailey", "Desktop"])
      .then(({ id }) => { if (alive) setDesktopFolderId(id); })
      .catch(() => { if (alive) setDesktopFolderId(null); });
    return () => { alive = false; };
  }, []);

  // Server-backed desktop children (files + folders the user creates).
  const { children: serverChildren, refresh: refreshServer } = useFsChildren(desktopFolderId);

  // Refresh when external code dispatches `bkos:fs-refresh` (e.g., right-click new folder)
  useEffect(() => {
    const handler = () => refreshServer();
    window.addEventListener("bkos:fs-refresh", handler);
    return () => window.removeEventListener("bkos:fs-refresh", handler);
  }, [refreshServer]);

  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean; cx: number; cy: number } | null>(null);
  const renameTimer = useRef<number | null>(null);

  // Build the merged item list: app shortcuts (client-side) + server desktop nodes.
  const items: Item[] = [];
  for (const sc of desktopShortcuts) {
    const meta = APP_MAP[sc.appId];
    if (!meta) continue;
    items.push({ kind: "app", id: sc.id, appId: sc.appId, label: sc.label ?? meta.name });
  }
  for (const node of serverChildren) {
    if (node.type === "folder") {
      items.push({ kind: "folder", id: `srv:${node.id}`, serverId: node.id, name: node.name, label: node.name });
    } else if (node.type === "file") {
      items.push({
        kind: "file",
        id: `srv:${node.id}`,
        serverId: node.id,
        name: node.name,
        fileKind: node.kind,
        label: node.name,
      });
    }
  }

  const positionFor = (id: string, index: number) => iconPositions[id] ?? defaultPos(index);

  const cancelPendingRename = () => {
    if (renameTimer.current !== null) {
      clearTimeout(renameTimer.current);
      renameTimer.current = null;
    }
  };
  const startRename = (id: string, currentLabel: string) => {
    cancelPendingRename();
    setRenaming(id);
    setDraft(currentLabel);
  };
  const commitRename = () => {
    if (renaming) {
      const item = items.find((it) => it.id === renaming);
      if (item) {
        if (item.kind === "app") {
          renameDesktopShortcut(item.id, draft.trim());
        } else {
          // Server-backed file or folder
          renameFsNode(item.serverId, draft.trim())
            .then(() => refreshServer())
            .catch((e) => console.error("rename failed:", e));
        }
      }
    }
    setRenaming(null);
    setDraft("");
  };
  const cancelRename = () => { setRenaming(null); setDraft(""); };

  const openItem = (item: Item) => {
    if (item.kind === "app") {
      openApp(item.appId);
    } else if (item.kind === "folder") {
      // Open Explorer at root for now (Phase 2 will accept a starting folder)
      openApp("mycomputer");
    } else if (item.kind === "file") {
      // For text-ish files, open in Notepad with the server node id.
      if (
        item.fileKind === "doc" ||
        item.fileKind === "code" ||
        item.fileKind === "config" ||
        item.fileKind === "other"
      ) {
        useOS.getState().setNotepadInitial({ path: [item.serverId], name: item.name });
        openApp("notepad");
      }
      // Other kinds (image/pdf/audio/video) — Phase 2 will add preview apps
    }
  };
  const deleteItem = (item: Item) => {
    if (item.kind === "app") {
      removeDesktopShortcut(item.id);
    } else {
      // Server-backed — recycle via API
      deleteFsNode(item.serverId)
        .then(() => refreshServer())
        .catch((e) => console.error("delete failed:", e));
    }
  };

  // Click off → deselect
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".desktop-icon")) setSelected(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Keyboard: Delete / Ctrl+C / Ctrl+V on the desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (renaming) return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
      const focusedEl = document.activeElement;
      if (focusedEl && focusedEl !== document.body && focusedEl.closest(".window")) return;

      if (e.key === "Delete") {
        if (selected) {
          const item = items.find((it) => it.id === selected);
          if (item) { e.preventDefault(); deleteItem(item); setSelected(null); }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selected) {
          const item = items.find((it) => it.id === selected);
          if (item && item.kind === "app") {
            e.preventDefault();
            setClipboard({ kind: "app-shortcut", appId: item.appId, label: item.label });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboard && clipboard.kind === "app-shortcut") {
          e.preventDefault();
          const fallback = defaultPos(items.length);
          addDesktopShortcut(clipboard.appId, fallback.x, fallback.y);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, renaming, items, clipboard]);

  const onPointerDown = (e: React.PointerEvent, item: Item, pos: { x: number; y: number }) => {
    if (e.button !== 0) return;
    if (renaming === item.id) return;
    e.stopPropagation();
    const wasSelected = selected === item.id;
    setSelected(item.id);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y, moved: false, cx: pos.x, cy: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (wasSelected) {
      cancelPendingRename();
      renameTimer.current = window.setTimeout(() => {
        renameTimer.current = null;
        startRename(item.id, item.label);
      }, 320);
    }
  };
  const onPointerMove = (e: React.PointerEvent, id: string) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.current.moved) cancelPendingRename();
    drag.current.moved = true;
    const nx = drag.current.ox + dx;
    const ny = drag.current.oy + dy;
    drag.current.cx = nx;
    drag.current.cy = ny;
    setIconPosition(id, nx, ny);
  };
  const onPointerUp = (e: React.PointerEvent, id: string) => {
    if (drag.current?.moved && gridSnap) {
      const targetCell = clampCell(cellOf({ x: drag.current.cx, y: drag.current.cy }));
      const occupied = items
        .filter((it) => it.id !== id)
        .map((it, i) => cellOf(positionFor(it.id, i)));
      const free = findFreeCell(targetCell, occupied);
      const p = posOf(free);
      setIconPosition(id, p.x, p.y);
    }
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const renderTile = (item: Item) => {
    if (item.kind === "app") {
      return (
        <span className="desktop-icon-tile">
          <AppIcon id={item.appId} size={32} />
          <img
            src="/icons/overlay_shortcut-1.png"
            alt=""
            className="pixel-img desktop-icon-shortcut"
            width={14}
            height={14}
            draggable={false}
          />
        </span>
      );
    }
    if (item.kind === "folder") {
      return (
        <span className="desktop-icon-tile">
          <FolderImg size={40} />
        </span>
      );
    }
    return (
      <span className="desktop-icon-tile">
        <FileImg kind={item.fileKind} size={40} />
      </span>
    );
  };

  return (
    <>
      {items.map((item, i) => {
        const pos = positionFor(item.id, i);
        const isRenaming = renaming === item.id;
        return (
          <button
            key={item.id}
            className={"desktop-icon" + (selected === item.id ? " is-selected" : "")}
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(e) => onPointerDown(e, item, pos)}
            onPointerMove={(e) => onPointerMove(e, item.id)}
            onPointerUp={(e) => onPointerUp(e, item.id)}
            onDoubleClick={() => {
              if (isRenaming) return;
              cancelPendingRename();
              openItem(item);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelected(item.id);
              const isTextLike = item.kind === "file" && (item.fileKind === "doc" || item.fileKind === "code" || item.fileKind === "config" || item.fileKind === "other");
              const openLabel = item.kind === "folder" ? "Open" : item.kind === "file" ? (isTextLike ? "Open in Notepad" : "Open") : "Open";
              openMenu(e.clientX, e.clientY, [
                { label: openLabel, icon: item.kind === "folder" ? "folder" : item.kind === "file" ? "notes" : (APP_MAP[(item as any).appId]?.icon ?? "grid"), onSelect: () => openItem(item) },
                { separator: true },
                { label: "Rename", icon: "refresh", onSelect: () => startRename(item.id, item.label) },
                { label: "Delete", danger: true, onSelect: () => { deleteItem(item); setSelected(null); } },
              ]);
            }}
          >
            {renderTile(item)}
            {isRenaming ? (
              <input
                className="desktop-icon-rename"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                  else if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="desktop-icon-label">{item.label}</span>
            )}
          </button>
        );
      })}
    </>
  );
}
