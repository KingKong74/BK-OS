"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import {
  VFS_ROOT,
  nodeAtPath,
  fileIcon,
  formatSize,
  formatDate,
  type FsNode,
} from "@/os/vfs";

const THUMB_TINTS = ["#E1F5EE", "#FAEEDA", "#E6F1FB", "#FAECE7", "#EEEDFE", "#FBEAF0", "#EAF3DE", "#F1EFE8"];
function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % THUMB_TINTS.length;
  return THUMB_TINTS[h];
}

function sortEntries(entries: FsNode[]): FsNode[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function Explorer({ initialPath = [] as string[] }: { initialPath?: string[] }) {
  const [path, setPath] = useState<string[]>(initialPath);
  const [back, setBack] = useState<string[][]>([]);
  const [fwd, setFwd] = useState<string[][]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const current = nodeAtPath(path);
  const entries = useMemo(() => {
    const list = current ? sortEntries(current.children) : [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;
  }, [current, query]);

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

  const open = (entry: FsNode) => {
    if (entry.type === "folder") navigate([...path, entry.name]);
    else setSelected(entry.name);
  };

  const crumbs = ["Vault", ...path];
  const quickLocations = VFS_ROOT.children.filter((c) => c.type === "folder");

  return (
    <div className="explorer">
      <div className="exp-toolbar">
        <div className="exp-nav">
          <button onClick={goBack} disabled={!back.length} aria-label="Back"><Icon name="arrow-left" size={16} /></button>
          <button onClick={goFwd} disabled={!fwd.length} aria-label="Forward"><Icon name="arrow-right" size={16} /></button>
          <button onClick={goUp} disabled={!path.length} aria-label="Up"><Icon name="arrow-up" size={16} /></button>
        </div>
        <div className="exp-crumbs">
          {crumbs.map((c, i) => (
            <span key={i} className="exp-crumb">
              {i > 0 && <Icon name="chevron-right" size={13} />}
              <button onClick={() => navigate(path.slice(0, i))}>{c}</button>
            </span>
          ))}
        </div>
        <div className="exp-tools">
          <div className="exp-search">
            <Icon name="search" size={14} />
            <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className={"exp-viewbtn" + (view === "grid" ? " is-active" : "")} onClick={() => setView("grid")} aria-label="Grid view"><Icon name="grid" size={15} /></button>
          <button className={"exp-viewbtn" + (view === "list" ? " is-active" : "")} onClick={() => setView("list")} aria-label="List view"><Icon name="list" size={15} /></button>
        </div>
      </div>

      <div className="exp-body">
        <aside className="exp-side">
          <button className={"exp-loc" + (path.length === 0 ? " is-active" : "")} onClick={() => navigate([])}>
            <Icon name="server" size={16} /> This vault
          </button>
          {quickLocations.map((loc) => (
            <button key={loc.name} className={"exp-loc" + (path[0] === loc.name && path.length === 1 ? " is-active" : "")} onClick={() => navigate([loc.name])}>
              <Icon name="folder" size={16} /> {loc.name}
            </button>
          ))}
        </aside>

        <section className={"exp-pane exp-" + view}>
          {entries.length === 0 && <div className="exp-empty">Nothing here.</div>}

          {view === "grid"
            ? entries.map((e) => (
                <button
                  key={e.name}
                  className={"exp-tile" + (selected === e.name ? " is-selected" : "")}
                  onClick={() => setSelected(e.name)}
                  onDoubleClick={() => open(e)}
                >
                  <span className="exp-thumb">
                    {e.type === "folder" ? (
                      <Icon name="folder" size={30} />
                    ) : e.kind === "image" ? (
                      <span className="exp-image" style={{ background: tintFor(e.name) }} />
                    ) : (
                      <Icon name={fileIcon(e.kind)} size={26} />
                    )}
                  </span>
                  <span className="exp-name">{e.name}</span>
                </button>
              ))
            : entries.map((e) => (
                <div
                  key={e.name}
                  className={"exp-row" + (selected === e.name ? " is-selected" : "")}
                  onClick={() => setSelected(e.name)}
                  onDoubleClick={() => open(e)}
                >
                  <span className="exp-row-name">
                    <Icon name={e.type === "folder" ? "folder" : fileIcon(e.kind)} size={16} />
                    {e.name}
                  </span>
                  <span className="exp-row-kind">{e.type === "folder" ? "Folder" : e.kind}</span>
                  <span className="exp-row-size">{e.type === "file" ? formatSize(e.size) : "—"}</span>
                  <span className="exp-row-date">{e.type === "file" ? formatDate(e.modified) : "—"}</span>
                </div>
              ))}
        </section>
      </div>

      <div className="exp-status">
        <span>{entries.length} item{entries.length === 1 ? "" : "s"}</span>
        {selected && <span>{selected}</span>}
      </div>
    </div>
  );
}
