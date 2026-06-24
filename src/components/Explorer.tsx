"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { Icon } from "./Icon";
import { FolderImg, FileImg, DriveImg } from "./FsIcons";
import {
  useFsChildren,
  createFsNode,
  renameFsNode,
  deleteFsNode,
  formatSize,
  formatDate,
  kindLabel,
  type FsNodeDTO,
} from "@/hooks/useFs";

interface PathSeg {
  id: string | null; // null means root
  name: string;       // "My Computer" for root
}

const ROOT_SEG: PathSeg = { id: null, name: "My Computer" };

function sortNodes(nodes: FsNodeDTO[]): FsNodeDTO[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function pathToString(segs: PathSeg[]): string {
  if (segs.length <= 1) return "My Computer";
  const names = segs.slice(1).map((s) => s.name);
  if (/^[A-Z]:$/.test(names[0])) {
    if (names.length === 1) return `${names[0]}\\`;
    return `${names[0]}\\${names.slice(1).join("\\")}`;
  }
  return names.join("\\");
}

export function Explorer({ initialPath: _initialPath = [] as string[] }: { initialPath?: string[] }) {
  // Path is an array of breadcrumb segments. First element is always root.
  const [stack, setStack] = useState<PathSeg[]>([ROOT_SEG]);
  const [back, setBack] = useState<PathSeg[][]>([]);
  const [fwd, setFwd] = useState<PathSeg[][]>([]);
  // View mode is a global preference (persisted in the store) so it's
  // consistent across Explorer windows and survives reloads.
  const view = useOS((s) => s.explorerView);
  const setView = useOS((s) => s.setExplorerView);
  const iconSize = view === "small" ? 22 : 32;
  const [selected, setSelected] = useState<string | null>(null);
  const [editingAddr, setEditingAddr] = useState(false);
  const [addrDraft, setAddrDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openMenu = useOS((s) => s.openMenu);
  const openApp = useOS((s) => s.openApp);
  const requestOpenInNotepad = useOS((s) => s.requestOpenInNotepad);

  const currentSeg = stack[stack.length - 1];
  const { children, loading, refresh } = useFsChildren(currentSeg.id);
  const entries = useMemo(() => sortNodes(children), [children]);

  const navigateTo = (next: PathSeg[]) => {
    setBack((b) => [...b, stack]);
    setFwd([]);
    setStack(next);
    setSelected(null);
  };

  const goBack = () => {
    if (back.length === 0) return;
    const prev = back[back.length - 1];
    setBack((b) => b.slice(0, -1));
    setFwd((f) => [...f, stack]);
    setStack(prev);
    setSelected(null);
  };
  const goFwd = () => {
    if (fwd.length === 0) return;
    const next = fwd[fwd.length - 1];
    setFwd((f) => f.slice(0, -1));
    setBack((b) => [...b, stack]);
    setStack(next);
    setSelected(null);
  };
  const goUp = () => {
    if (stack.length <= 1) return;
    navigateTo(stack.slice(0, -1));
  };

  const enter = (node: FsNodeDTO) => {
    if (node.type === "folder") {
      navigateTo([...stack, { id: node.id, name: node.name }]);
      return;
    }
    if (node.type === "file") {
      if (node.kind === "doc" || node.kind === "code" || node.kind === "config") {
        // Open in Notepad — pass the node id via store
        useOS.getState().setNotepadInitial({ path: [node.id], name: node.name });
        openApp("notepad");
        return;
      }
      // Other file types — just select for now (preview app coming later)
      setSelected(node.id);
    }
  };

  const createFolder = async () => {
    try {
      const baseName = "New folder";
      const existing = entries.map((e) => e.name);
      let name = baseName;
      let i = 2;
      while (existing.includes(name)) { name = `${baseName} (${i})`; i++; }
      await createFsNode(currentSeg.id, name, "folder");
      refresh();
      window.dispatchEvent(new CustomEvent("bkos:fs-refresh"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  const createTextFile = async () => {
    try {
      const baseName = "New Text Document.txt";
      const existing = entries.map((e) => e.name);
      let name = baseName;
      let i = 2;
      while (existing.includes(name)) { name = `New Text Document (${i}).txt`; i++; }
      await createFsNode(currentSeg.id, name, "file", "doc", "");
      refresh();
      window.dispatchEvent(new CustomEvent("bkos:fs-refresh"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  const beginRename = (node: FsNodeDTO) => {
    setRenamingId(node.id);
    setRenameDraft(node.name);
  };
  const commitRename = async () => {
    if (!renamingId) return;
    const node = entries.find((e) => e.id === renamingId);
    if (!node) { setRenamingId(null); return; }
    if (renameDraft.trim() && renameDraft !== node.name) {
      try {
        await renameFsNode(renamingId, renameDraft.trim());
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "rename failed");
      }
    }
    setRenamingId(null);
    setRenameDraft("");
  };
  const cancelRename = () => { setRenamingId(null); setRenameDraft(""); };

  const recycleNode = async (node: FsNodeDTO) => {
    if (node.isSystem) {
      setError("System folders cannot be deleted");
      return;
    }
    try {
      await deleteFsNode(node.id);
      setSelected(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    }
  };

  // Right-click on the entry area (empty space)
  const onPanelContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".exp-entry")) return;
    e.preventDefault();
    openMenu(e.clientX, e.clientY, [
      { label: "New folder", icon: "folder", onSelect: () => createFolder() },
      { label: "New text document", icon: "notes", onSelect: () => createTextFile() },
      { separator: true },
      { label: "Refresh", icon: "refresh", onSelect: () => refresh() },
    ]);
  };

  const onEntryContextMenu = (e: React.MouseEvent, node: FsNodeDTO) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(node.id);
    openMenu(e.clientX, e.clientY, [
      { label: "Open", icon: node.type === "folder" ? "folder" : "file", onSelect: () => enter(node) },
      { separator: true },
      { label: "Rename", icon: "notes", onSelect: () => beginRename(node), disabled: node.isSystem },
      { label: "Delete", icon: "close", danger: true, onSelect: () => recycleNode(node), disabled: node.isSystem },
    ]);
  };

  // Address bar
  const startEditAddr = () => { setAddrDraft(pathToString(stack)); setEditingAddr(true); };
  const cancelAddr = () => setEditingAddr(false);

  // Parse "C:\Users\Bailey\Documents" or similar into segments, then resolve + navigate
  const commitAddr = async () => {
    const raw = addrDraft.trim();
    setEditingAddr(false);
    if (!raw) return;
    // Normalize: accept both "/" and "\" separators, split on either
    const segs = raw.split(/[\\/]+/).filter(Boolean);
    if (segs.length === 0) return;
    try {
      // Use the resolvePath helper to find the node id for the destination
      const mod = await import("@/hooks/useFs");
      const { id } = await mod.resolvePath(segs);
      if (id) {
        // Build a stack that mirrors the path
        const newStack: PathSeg[] = [ROOT_SEG, ...segs.map((name, idx) => ({ id: idx === segs.length - 1 ? id : "", name }))];
        // For intermediate ids we don't actually know — just leave blank.
        // Last segment's id is what useFsChildren needs.
        navigateTo(newStack);
      } else {
        setError(`Path not found: ${raw}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "navigate failed");
    }
  };

  // Auto-clear errors after a few sec
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  // Refresh when external code dispatches `bkos:fs-refresh`
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("bkos:fs-refresh", handler);
    return () => window.removeEventListener("bkos:fs-refresh", handler);
  }, [refresh]);

  // Keyboard shortcut: F2 rename, Delete = recycle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      if (renamingId) return;
      const node = entries.find((n) => n.id === selected);
      if (!node) return;
      if (e.key === "F2") { e.preventDefault(); beginRename(node); }
      else if (e.key === "Delete") { e.preventDefault(); recycleNode(node); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, entries, renamingId]);

  return (
    <div className="exp">
      {/* Toolbar / menubar */}
      <div className="exp-menubar">
        <button className="exp-menu-item" onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          openMenu(r.left, r.bottom, [
            { label: "New folder", icon: "folder", onSelect: () => createFolder() },
            { label: "New text document", icon: "notes", onSelect: () => createTextFile() },
            { separator: true },
            { label: "Close", icon: "close", onSelect: () => useOS.getState().closeWindow(useOS.getState().focusedId ?? "") },
          ]);
        }}>File</button>
        <button className="exp-menu-item" onClick={() => beginRename(entries.find((e) => e.id === selected) ?? entries[0])}>Edit</button>
        <button className="exp-menu-item" onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          openMenu(r.left, r.bottom, [
            { label: (view === "small" ? "✓ " : "") + "Small icons", icon: "grid", onSelect: () => setView("small") },
            { label: (view === "large" ? "✓ " : "") + "Large icons", icon: "grid", onSelect: () => setView("large") },
            { label: (view === "details" ? "✓ " : "") + "Details", icon: "list", onSelect: () => setView("details") },
            { separator: true },
            { label: "Refresh", icon: "refresh", onSelect: () => refresh() },
          ]);
        }}>View</button>
        <button className="exp-menu-item" onClick={goUp} disabled={stack.length <= 1}>Go up</button>
        <button className="exp-menu-item" onClick={() => useOS.getState().openApp("help")}>Help</button>
      </div>

      {/* Nav bar */}
      <div className="exp-toolbar">
        <button className="exp-tool-btn" onClick={goBack} disabled={back.length === 0} title="Back">
          <Icon name="arrow-left" size={14} /> <span>Back</span>
        </button>
        <button className="exp-tool-btn" onClick={goFwd} disabled={fwd.length === 0} title="Forward">
          <Icon name="arrow-right" size={14} />
        </button>
        <button className="exp-tool-btn" onClick={goUp} disabled={stack.length <= 1} title="Up">
          <Icon name="arrow-up" size={14} />
        </button>
        <div className="exp-addr-row">
          <span className="exp-addr-label">Address</span>
          {editingAddr ? (
            <input
              autoFocus
              className="exp-addr-input"
              value={addrDraft}
              onChange={(e) => setAddrDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitAddr(); }
                else if (e.key === "Escape") cancelAddr();
              }}
              onBlur={cancelAddr}
            />
          ) : (
            <button className="exp-addr-display" onClick={startEditAddr}>
              <DriveImg size={14} /> <span>{pathToString(stack)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Entries */}
      <div
        className="exp-body"
        onContextMenu={onPanelContextMenu}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest(".exp-entry")) setSelected(null);
        }}
      >
        {loading && <div className="exp-empty">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="exp-empty">
            <div style={{ marginBottom: 8 }}>This folder is empty.</div>
            <div style={{ fontSize: 11, color: "#666" }}>Right-click to create a folder or text file.</div>
          </div>
        )}
        {!loading && entries.length > 0 && (
          view !== "details" ? (
            <div className={"exp-grid exp-grid-" + view}>
              {entries.map((node) => (
                <button
                  key={node.id}
                  className={"exp-entry" + (selected === node.id ? " is-sel" : "") + (node.isSystem ? " is-system" : "")}
                  onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
                  onDoubleClick={() => enter(node)}
                  onContextMenu={(e) => onEntryContextMenu(e, node)}
                  title={node.name}
                >
                  <div className="exp-entry-icon">
                    {node.type === "folder" ? <FolderImg size={iconSize} /> : <FileImg size={iconSize} kind={node.kind as never} />}
                  </div>
                  {renamingId === node.id ? (
                    <input
                      autoFocus
                      className="exp-rename"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                        else if (e.key === "Escape") cancelRename();
                      }}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="exp-entry-label">{node.name}</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <table className="exp-list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Modified</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((node) => (
                  <tr
                    key={node.id}
                    className={"exp-row" + (selected === node.id ? " is-sel" : "")}
                    onClick={() => setSelected(node.id)}
                    onDoubleClick={() => enter(node)}
                    onContextMenu={(e) => onEntryContextMenu(e, node)}
                  >
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {node.type === "folder" ? <FolderImg size={14} /> : <FileImg size={14} kind={node.kind as never} />}
                        {renamingId === node.id ? (
                          <input
                            autoFocus
                            className="exp-rename"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                              else if (e.key === "Escape") cancelRename();
                            }}
                            onBlur={commitRename}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : node.name}
                      </span>
                    </td>
                    <td>{kindLabel(node)}</td>
                    <td>{node.type === "file" ? formatSize(node.sizeBytes) : "—"}</td>
                    <td>{formatDate(node.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Status bar */}
      <div className="exp-status">
        <span>{entries.length} item{entries.length === 1 ? "" : "s"}</span>
        {selected && <span>· {entries.find((e) => e.id === selected)?.name}</span>}
        {error && <span style={{ color: "#a00", marginLeft: "auto" }}>{error}</span>}
      </div>
    </div>
  );
}
