"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";
import { FolderImg, FileImg, DriveImg } from "./FsIcons";
import {
  VFS_ROOT,
  nodeAtPath,
  resolveNode,
  listChildren,
  uniqueName,
  fileIcon,
  formatSize,
  formatDate,
  pathToString,
  parsePath,
  isDriveSegment,
  type FsNode,
  type FileNode,
  type FolderNode,
} from "@/os/vfs";

const MENU_ITEMS = ["File", "Edit", "View", "Go", "Favorites", "Help"];

interface MenuOption {
  label?: string;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

function sortEntries(entries: FsNode[]): FsNode[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function kindLabel(e: FsNode): string {
  if (e.type === "folder") return "Folder";
  if (e.kind === "app") return "Application";
  if (e.kind === "image") return "Image";
  if (e.kind === "pdf") return "PDF Document";
  if (e.kind === "doc") return "Text Document";
  if (e.kind === "sheet") return "Spreadsheet";
  return "File";
}

export function Explorer({ initialPath = [] as string[] }: { initialPath?: string[] }) {
  const [path, setPath] = useState<string[]>(() => {
    if (typeof window === "undefined") return initialPath;
    return useOS.getState().vaultInitialPath ?? initialPath;
  });
  const [back, setBack] = useState<string[][]>([]);
  const [fwd, setFwd] = useState<string[][]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string | null>(null);
  const [editingAddr, setEditingAddr] = useState(false);
  const [addrDraft, setAddrDraft] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [renamingEntry, setRenamingEntry] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameTimer = useRef<number | null>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const explorerRef = useRef<HTMLDivElement | null>(null);

  const openApp = useOS((s) => s.openApp);
  const openMenu = useOS((s) => s.openMenu);
  const closeWindow = useOS((s) => s.closeWindow);
  const focusedId = useOS((s) => s.focusedId);
  const vaultInitial = useOS((s) => s.vaultInitialPath);
  const setVaultInitialPath = useOS((s) => s.setVaultInitialPath);
  const deletedPaths = useOS((s) => s.deletedPaths);
  const recycle = useOS((s) => s.recycle);
  const pathLabels = useOS((s) => s.pathLabels);
  const setPathLabel = useOS((s) => s.setPathLabel);
  const vfsAdditions = useOS((s) => s.vfsAdditions);
  const addVfsNode = useOS((s) => s.addVfsNode);
  const removeVfsNode = useOS((s) => s.removeVfsNode);
  const clipboard = useOS((s) => s.clipboard);
  const setClipboard = useOS((s) => s.setClipboard);
  const requestOpenInNotepad = useOS((s) => s.requestOpenInNotepad);
  const addDesktopShortcut = useOS((s) => s.addDesktopShortcut);

  useEffect(() => {
    if (vaultInitial) {
      setPath(vaultInitial);
      setBack([]);
      setFwd([]);
      setSelected(null);
      setVaultInitialPath(null);
    }
  }, [vaultInitial, setVaultInitialPath]);

  const current = resolveNode(path, vfsAdditions);
  const entries = useMemo(() => {
    const list = sortEntries(listChildren(path, vfsAdditions));
    return list.filter((e) => !deletedPaths.includes([...path, e.name].join("/")));
  }, [path, vfsAdditions, deletedPaths]);

  const navigate = (np: string[]) => {
    setBack((b) => [...b, path]);
    setFwd([]);
    setPath(np);
    setSelected(null);
  };
  const goBack = () => {
    if (!back.length) return;
    const prev = back[back.length - 1];
    setBack((b) => b.slice(0, -1));
    setFwd((f) => [...f, path]);
    setPath(prev);
    setSelected(null);
  };
  const goFwd = () => {
    if (!fwd.length) return;
    const next = fwd[fwd.length - 1];
    setFwd((f) => f.slice(0, -1));
    setBack((b) => [...b, path]);
    setPath(next);
    setSelected(null);
  };
  const goUp = () => path.length && navigate(path.slice(0, -1));

  const rootName = VFS_ROOT.name;

  const startEditAddr = () => {
    setAddrDraft(pathToString(path));
    setEditingAddr(true);
  };
  const commitAddr = () => {
    const parsed = parsePath(addrDraft);
    if (parsed) navigate(parsed);
    setEditingAddr(false);
  };
  const cancelAddr = () => setEditingAddr(false);

  const open = (entry: FsNode) => {
    if (entry.type === "folder") { navigate([...path, entry.name]); return; }
    if (entry.type === "file" && entry.kind === "app" && entry.appId) {
      openApp(entry.appId);
      return;
    }
    if (entry.type === "file" && entry.kind === "doc") {
      requestOpenInNotepad([...path, entry.name], entry.name);
      return;
    }
    setSelected(entry.name);
  };

  const fullPathOf = (name: string) => [...path, name].join("/");
  const labelFor = (e: FsNode) => pathLabels[fullPathOf(e.name)] ?? e.name;
  const cancelPendingRename = () => {
    if (renameTimer.current !== null) {
      clearTimeout(renameTimer.current);
      renameTimer.current = null;
    }
  };
  const startRenameEntry = (entryName: string) => {
    cancelPendingRename();
    setRenamingEntry(entryName);
    setRenameDraft(pathLabels[fullPathOf(entryName)] ?? entryName);
  };
  const commitRenameEntry = () => {
    if (renamingEntry) setPathLabel(fullPathOf(renamingEntry), renameDraft);
    setRenamingEntry(null);
    setRenameDraft("");
  };
  const cancelRenameEntry = () => {
    setRenamingEntry(null);
    setRenameDraft("");
  };
  const onEntryClick = (entry: FsNode) => {
    const wasSelected = selected === entry.name;
    setSelected(entry.name);
    if (wasSelected) {
      cancelPendingRename();
      renameTimer.current = window.setTimeout(() => {
        renameTimer.current = null;
        startRenameEntry(entry.name);
      }, 320);
    }
  };

  const deleteSelected = () => {
    if (!selected) return;
    const entry = entries.find((e) => e.name === selected);
    if (!entry) return;
    const parentKey = path.join("/");
    const customAtParent = vfsAdditions[parentKey] ?? [];
    const isCustom = customAtParent.some((c) => c.name === entry.name);
    if (isCustom) {
      removeVfsNode(path, entry.name);
    } else {
      recycle({
        fullPath: [...path, entry.name].join("/"),
        originalParent: [...path],
        node: entry,
        deletedAt: new Date().toISOString(),
      });
    }
    setSelected(null);
  };

  const copySelectedToClipboard = (mode: "copy" | "cut") => {
    if (!selected) return;
    const entry = entries.find((e) => e.name === selected);
    if (!entry) return;
    // V1: only app launchers go to clipboard (we don't yet support copying arbitrary files)
    if (entry.type === "file" && entry.kind === "app" && entry.appId) {
      setClipboard({ kind: "app-shortcut", appId: entry.appId, label: labelFor(entry) });
    }
    // Cut for other kinds is a no-op until file backend lands
  };

  const pasteHere = () => {
    if (!clipboard) return;
    if (clipboard.kind === "app-shortcut") {
      // Add a shortcut entry into the current folder
      const existingNames = (listChildren(path, vfsAdditions) as FsNode[]).map((n) => n.name);
      const baseName = clipboard.label ?? "Shortcut";
      const name = uniqueName(baseName, existingNames);
      addVfsNode(path, {
        type: "file",
        name,
        kind: "app",
        size: 0,
        modified: new Date().toISOString().slice(0, 10),
        appId: clipboard.appId,
      });
    }
  };

  // Keyboard: Delete recycles, Ctrl+C/X copies app-shortcuts to clipboard, Ctrl+V pastes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (renamingEntry || editingAddr) return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
      const focused = document.activeElement;
      // Only respond if this explorer's DOM ancestor contains the focused element,
      // otherwise multiple explorers would all act on the same keypress.
      const explorerRoot = explorerRef.current;
      if (explorerRoot && focused && !explorerRoot.contains(focused) && focused !== document.body) return;

      if (e.key === "Delete") {
        if (selected) { e.preventDefault(); deleteSelected(); }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selected) { e.preventDefault(); copySelectedToClipboard("copy"); }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
        if (selected) { e.preventDefault(); copySelectedToClipboard("cut"); }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboard) { e.preventDefault(); pasteHere(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, renamingEntry, editingAddr, entries, path, clipboard, vfsAdditions]);

  const paneMenu = (ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest(".exp-tile, .exp-row, .exp-rename-wrap")) return;
    ev.preventDefault();
    ev.stopPropagation();
    const existingNames = entries.map((e) => e.name);
    openMenu(ev.clientX, ev.clientY, [
      {
        label: "New folder",
        icon: "folder",
        onSelect: () => {
          const name = uniqueName("New folder", existingNames);
          addVfsNode(path, { type: "folder", name, children: [] });
          setSelected(name);
          setTimeout(() => startRenameEntry(name), 50);
        },
      },
      {
        label: "New text document",
        icon: "notes",
        onSelect: () => {
          const name = uniqueName("New Text Document.txt", existingNames);
          addVfsNode(path, {
            type: "file", name, kind: "doc", size: 0,
            modified: new Date().toISOString().slice(0, 10),
          });
          setSelected(name);
          setTimeout(() => startRenameEntry(name), 50);
        },
      },
      { separator: true },
      { label: "Paste", onSelect: pasteHere, disabled: !clipboard },
      { separator: true },
      { label: "Refresh", icon: "refresh", onSelect: () => setSelected(null) },
    ]);
  };

  const entryMenu = (ev: React.MouseEvent, entry: FsNode) => {
    ev.preventDefault();
    ev.stopPropagation();
    setSelected(entry.name);
    const canCopy = entry.type === "file" && entry.kind === "app";
    openMenu(ev.clientX, ev.clientY, [
      { label: "Open", icon: entry.type === "folder" ? "folder" : fileIcon(entry.kind), onSelect: () => open(entry) },
      { separator: true },
      { label: "Cut", disabled: !canCopy, onSelect: canCopy ? () => copySelectedToClipboard("cut") : undefined },
      { label: "Copy", disabled: !canCopy, onSelect: canCopy ? () => copySelectedToClipboard("copy") : undefined },
      { separator: true },
      { label: "Rename", icon: "refresh", onSelect: () => startRenameEntry(entry.name) },
      {
        label: "Delete",
        danger: true,
        onSelect: () => { setSelected(entry.name); deleteSelected(); },
      },
      { separator: true },
      { label: "Properties", disabled: true },
    ]);
  };

  const crumbs = [rootName, ...path];
  const drives = VFS_ROOT.children.filter(
    (c) => c.type === "folder" && c.drive
  ) as Array<FsNode & { type: "folder" }>;
  const primaryDrive = drives[0];
  const driveFolders = primaryDrive
    ? primaryDrive.children.filter((c) => c.type === "folder") as Array<FsNode & { type: "folder" }>
    : [];

  const renderEntryIcon = (e: FsNode, size: number) => {
    if (e.type === "folder") {
      if (e.drive) return <DriveImg size={size} />;
      return <FolderImg size={size} />;
    }
    if (e.kind === "app" && e.appId) {
      // App launcher entries get a tiny shortcut overlay
      return (
        <span className="exp-icon-with-overlay" style={{ width: size, height: size }}>
          <AppIcon id={e.appId} size={size} />
          <img
            src="/icons/overlay_shortcut-0.png"
            alt=""
            className="pixel-img exp-shortcut-overlay"
            width={Math.max(10, Math.round(size * 0.35))}
            height={Math.max(10, Math.round(size * 0.35))}
            draggable={false}
          />
        </span>
      );
    }
    return <FileImg kind={e.kind} size={size} />;
  };

  const menuDefs: Record<string, MenuOption[]> = {
    File: [
      { label: "New folder", disabled: true },
      { separator: true },
      { label: "Close", onClick: () => { if (focusedId) closeWindow(focusedId); } },
    ],
    Edit: [
      { label: "Cut", disabled: true },
      { label: "Copy", disabled: true },
      { label: "Paste", disabled: true },
      { separator: true },
      { label: "Select all", disabled: true },
    ],
    View: [
      { label: "Large icons", onClick: () => setView("grid"), checked: view === "grid" },
      { label: "Details", onClick: () => setView("list"), checked: view === "list" },
      { separator: true },
      { label: "Refresh", onClick: () => setSelected(null) },
    ],
    Go: [
      { label: "Back", onClick: goBack, disabled: !back.length },
      { label: "Forward", onClick: goFwd, disabled: !fwd.length },
      { label: "Up one level", onClick: goUp, disabled: !path.length },
      { separator: true },
      { label: "My Computer", onClick: () => navigate([]) },
    ],
    Favorites: [
      { label: "Add to Favorites…", disabled: true },
    ],
    Help: [
      { label: "Help contents", onClick: () => openApp("help") },
      { separator: true },
      { label: "About bailey.os", disabled: true },
    ],
  };

  const onMenuOption = (opt: MenuOption) => {
    if (opt.disabled || opt.separator) return;
    opt.onClick?.();
    setOpenMenuId(null);
  };

  const openMenuAt = (m: string) => {
    if (openMenuId === m) { setOpenMenuId(null); return; }
    const btn = menuBtnRefs.current[m];
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setMenuPos({ x: r.left, y: r.bottom });
    setOpenMenuId(m);
  };

  return (
    <div className="explorer" ref={explorerRef} tabIndex={-1}>
      {/* Menu bar */}
      <div className="exp-menubar">
        {MENU_ITEMS.map((m) => (
          <button
            key={m}
            ref={(el) => { menuBtnRefs.current[m] = el; }}
            className={"exp-menu-item" + (openMenuId === m ? " is-open" : "")}
            onClick={() => openMenuAt(m)}
            onMouseEnter={() => { if (openMenuId && openMenuId !== m) openMenuAt(m); }}
          >{m}</button>
        ))}
      </div>
      {openMenuId && menuPos && (
        <>
          <div className="exp-menu-backdrop" onClick={() => setOpenMenuId(null)} />
          <div className="exp-menu-dropdown" style={{ left: menuPos.x, top: menuPos.y }}>
            {menuDefs[openMenuId].map((opt, i) =>
              opt.separator ? (
                <div key={i} className="exp-menu-sep" />
              ) : (
                <button
                  key={i}
                  className={"exp-menu-option" + (opt.checked ? " is-checked" : "")}
                  disabled={opt.disabled}
                  onClick={() => onMenuOption(opt)}
                >
                  <span className="exp-menu-check">{opt.checked ? "•" : ""}</span>
                  <span>{opt.label}</span>
                </button>
              )
            )}
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="exp-toolbar">
        <div className="exp-tool-group">
          <button className="exp-tbtn" onClick={goBack} disabled={!back.length} title="Back">
            <Icon name="arrow-left" size={15} />
            <span>Back</span>
          </button>
          <button className="exp-tbtn icon-only" onClick={goFwd} disabled={!fwd.length} title="Forward">
            <Icon name="arrow-right" size={15} />
          </button>
          <button className="exp-tbtn icon-only" onClick={goUp} disabled={!path.length} title="Up one level">
            <Icon name="arrow-up" size={15} />
          </button>
        </div>
        <span className="exp-tool-sep" />
        <div className="exp-tool-group">
          <button className="exp-tbtn icon-only" title="Cut" disabled>✂</button>
          <button className="exp-tbtn icon-only" title="Copy" disabled>⧉</button>
          <button className="exp-tbtn icon-only" title="Paste" disabled>📋</button>
        </div>
        <span className="exp-tool-sep" />
        <div className="exp-tool-group">
          <button className="exp-tbtn icon-only" title="Delete" onClick={deleteSelected} disabled={!selected}>
            <img src="/icons/recycle_bin_full.png" alt="" className="pixel-img" width={16} height={16} />
          </button>
          <button className="exp-tbtn icon-only" title="Rename" disabled>
            <img src="/icons/rename.png" alt="" className="pixel-img" width={16} height={16} />
          </button>
        </div>
        <span className="exp-tool-sep" />
        <div className="exp-tool-group">
          <button className={"exp-tbtn icon-only" + (view === "grid" ? " is-active" : "")} onClick={() => setView("grid")} title="Icons view">
            <Icon name="grid" size={14} />
          </button>
          <button className={"exp-tbtn icon-only" + (view === "list" ? " is-active" : "")} onClick={() => setView("list")} title="Details view">
            <Icon name="list" size={14} />
          </button>
        </div>
      </div>

      {/* Address bar */}
      <div className="exp-addressbar">
        <span className="exp-addr-label">Address</span>
        {editingAddr ? (
          <div className="exp-addr-input is-editing">
            <FolderImg size={14} open />
            <input
              className="exp-addr-edit"
              autoFocus
              value={addrDraft}
              onChange={(e) => setAddrDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitAddr(); }
                else if (e.key === "Escape") { e.preventDefault(); cancelAddr(); }
              }}
              onBlur={commitAddr}
              spellCheck={false}
            />
          </div>
        ) : (
          <div
            className="exp-addr-input"
            onClick={(e) => {
              // Click on bg (not on a crumb button) → enter edit mode
              if ((e.target as HTMLElement).closest("button") === null) startEditAddr();
            }}
          >
            <FolderImg size={14} open />
            <span className="exp-addr-path">
              {crumbs.map((c, i) => (
                <span key={i} className="exp-addr-seg">
                  {i > 0 && <span className="exp-addr-sep">\</span>}
                  <button onClick={(e) => { e.stopPropagation(); navigate(path.slice(0, i)); }}>{c}</button>
                </span>
              ))}
            </span>
            <span className="exp-addr-dropdown" aria-hidden>▼</span>
          </div>
        )}
      </div>

      {/* Body: folders sidebar + entries pane */}
      <div className="exp-body">
        <aside className="exp-side">
          <div className="exp-side-title">Folders</div>
          <button className={"exp-loc" + (path.length === 0 ? " is-active" : "")} onClick={() => navigate([])}>
            <img src="/icons/computer_explorer.png" alt="" className="pixel-img" width={16} height={16} />
            <span>{rootName}</span>
          </button>
          {drives.map((d) => (
            <button
              key={d.name}
              className={"exp-loc exp-loc-indent-1" + (path[0] === d.name && path.length === 1 ? " is-active" : "")}
              onClick={() => navigate([d.name])}
            >
              <DriveImg size={16} />
              <span>{d.name}</span>
            </button>
          ))}
          {primaryDrive && driveFolders.map((f) => (
            <button
              key={f.name}
              className={"exp-loc exp-loc-indent-2" + (path[0] === primaryDrive.name && path[1] === f.name && path.length === 2 ? " is-active" : "")}
              onClick={() => navigate([primaryDrive.name, f.name])}
            >
              <FolderImg size={16} />
              <span>{f.name}</span>
            </button>
          ))}
        </aside>

        <section
          className={"exp-pane exp-" + view}
          onContextMenu={paneMenu}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              cancelPendingRename();
            }
          }}
        >
          {view === "list" && (
            <div className="exp-list-head">
              <span>Name</span>
              <span>Size</span>
              <span>Type</span>
              <span>Modified</span>
            </div>
          )}
          {entries.length === 0 && <div className="exp-empty">This folder is empty.</div>}
          {view === "grid"
            ? entries.map((e) => {
                const isApp = e.type === "file" && e.kind === "app" && !!e.appId;
                const isRenaming = renamingEntry === e.name;
                return (
                  <button
                    key={e.name}
                    className={"exp-tile" + (selected === e.name ? " is-selected" : "") + (isRenaming ? " is-renaming" : "")}
                    onClick={() => !isRenaming && onEntryClick(e)}
                    onDoubleClick={() => { cancelPendingRename(); open(e); }}
                    onContextMenu={(ev) => entryMenu(ev, e)}
                    draggable={isApp && !isRenaming}
                    onDragStart={(ev) => {
                      if (isApp && e.type === "file" && e.appId) {
                        ev.dataTransfer.setData("application/x-bailey-app", e.appId);
                        ev.dataTransfer.effectAllowed = "copy";
                      }
                    }}
                  >
                    <span className="exp-thumb">{renderEntryIcon(e, 36)}</span>
                    {isRenaming ? (
                      <span className="exp-rename-wrap">
                        <img src="/icons/rename.png" alt="" className="pixel-img exp-rename-icon" width={14} height={14} />
                        <input
                          className="exp-rename-input"
                          autoFocus
                          value={renameDraft}
                          onChange={(ev) => setRenameDraft(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") { ev.preventDefault(); commitRenameEntry(); }
                            else if (ev.key === "Escape") { ev.preventDefault(); cancelRenameEntry(); }
                          }}
                          onBlur={commitRenameEntry}
                          onClick={(ev) => ev.stopPropagation()}
                          onPointerDown={(ev) => ev.stopPropagation()}
                          onDoubleClick={(ev) => ev.stopPropagation()}
                        />
                      </span>
                    ) : (
                      <span className="exp-name">{labelFor(e)}</span>
                    )}
                  </button>
                );
              })
            : entries.map((e) => {
                const isApp = e.type === "file" && e.kind === "app" && !!e.appId;
                const isRenaming = renamingEntry === e.name;
                return (
                  <div
                    key={e.name}
                    className={"exp-row" + (selected === e.name ? " is-selected" : "") + (isRenaming ? " is-renaming" : "")}
                    onClick={() => !isRenaming && onEntryClick(e)}
                    onDoubleClick={() => { cancelPendingRename(); open(e); }}
                    onContextMenu={(ev) => entryMenu(ev, e)}
                    draggable={isApp && !isRenaming}
                    onDragStart={(ev) => {
                      if (isApp && e.type === "file" && e.appId) {
                        ev.dataTransfer.setData("application/x-bailey-app", e.appId);
                        ev.dataTransfer.effectAllowed = "copy";
                      }
                    }}
                  >
                    <span className="exp-row-name">
                      {renderEntryIcon(e, 18)}
                      {isRenaming ? (
                        <span className="exp-rename-wrap">
                          <img src="/icons/rename.png" alt="" className="pixel-img exp-rename-icon" width={14} height={14} />
                          <input
                            className="exp-rename-input"
                            autoFocus
                            value={renameDraft}
                            onChange={(ev) => setRenameDraft(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") { ev.preventDefault(); commitRenameEntry(); }
                              else if (ev.key === "Escape") { ev.preventDefault(); cancelRenameEntry(); }
                            }}
                            onBlur={commitRenameEntry}
                            onClick={(ev) => ev.stopPropagation()}
                            onPointerDown={(ev) => ev.stopPropagation()}
                            onDoubleClick={(ev) => ev.stopPropagation()}
                          />
                        </span>
                      ) : labelFor(e)}
                    </span>
                    <span className="exp-row-size">{e.type === "file" && e.kind !== "app" ? formatSize(e.size) : "—"}</span>
                    <span className="exp-row-kind">{kindLabel(e)}</span>
                    <span className="exp-row-date">{e.type === "file" && e.kind !== "app" ? formatDate(e.modified) : "—"}</span>
                  </div>
                );
              })}
        </section>
      </div>

      {/* Status bar */}
      <div className="exp-statusbar">
        <span className="exp-status-panel">{entries.length} object{entries.length === 1 ? "" : "s"}</span>
        <span className="exp-status-panel">
          {selected
            ? (() => {
                const e = entries.find((x) => x.name === selected) as FileNode | undefined;
                if (e && e.type === "file" && e.kind !== "app") return `${e.name} — ${formatSize(e.size)}`;
                return selected;
              })()
            : ""}
        </span>
      </div>
    </div>
  );
}
