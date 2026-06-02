"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APPS } from "@/os/appsMeta";
import { VFS_ROOT, fileIcon, type FsNode, type FileKind } from "@/os/vfs";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";

interface FileResult {
  name: string;
  type: "file" | "folder";
  kind?: FileKind;
  path: string[];
}

function searchVfs(
  node: { type: "folder"; children: FsNode[]; name: string },
  q: string,
  prefix: string[] = []
): FileResult[] {
  const out: FileResult[] = [];
  for (const c of node.children) {
    if (c.name.toLowerCase().includes(q)) {
      out.push({
        name: c.name,
        type: c.type,
        kind: c.type === "file" ? c.kind : undefined,
        path: [...prefix, c.name],
      });
    }
    if (c.type === "folder") out.push(...searchVfs(c, q, [...prefix, c.name]));
  }
  return out;
}

export function DockSearch() {
  const openApp = useOS((s) => s.openApp);
  const setVaultInitialPath = useOS((s) => s.setVaultInitialPath);
  const deletedPaths = useOS((s) => s.deletedPaths);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, []);

  const query = q.trim().toLowerCase();
  const appResults = query
    ? APPS.filter((a) => a.name.toLowerCase().includes(query)).slice(0, 6)
    : [];
  const fileResults = query
    ? searchVfs(VFS_ROOT, query)
        .filter((r) => {
          const full = r.path.join("/");
          return !deletedPaths.some((d) => full === d || full.startsWith(d + "/"));
        })
        .slice(0, 8)
    : [];
  const showPop = open && query.length > 0;

  const reset = () => { setQ(""); setOpen(false); };

  const openFileResult = (r: FileResult) => {
    const parent = r.type === "folder" ? r.path : r.path.slice(0, -1);
    setVaultInitialPath(parent);
    openApp("vault");
    reset();
  };
  const openAppResult = (id: string) => { openApp(id); reset(); };

  return (
    <div className="dock-search-wrap" ref={ref}>
      {showPop && (
        <div className="search-pop">
          {appResults.length === 0 && fileResults.length === 0 ? (
            <div className="search-empty">No matches.</div>
          ) : (
            <>
              {appResults.length > 0 && (
                <>
                  <div className="search-section">Apps</div>
                  {appResults.map((a) => (
                    <button key={a.id} className="search-item" onClick={() => openAppResult(a.id)}>
                      <span className="search-thumb">
                        <AppIcon id={a.id} size={20} />
                      </span>
                      <span className="search-label">{a.name}</span>
                    </button>
                  ))}
                </>
              )}
              {fileResults.length > 0 && (
                <>
                  <div className="search-section">Files</div>
                  {fileResults.map((r, i) => (
                    <button key={i} className="search-item" onClick={() => openFileResult(r)}>
                      <span className="search-thumb">
                        <Icon name={r.type === "folder" ? "folder" : fileIcon(r.kind ?? "other")} size={15} />
                      </span>
                      <span className="search-label">
                        {r.name}
                        <span className="search-path"> · {r.path.slice(0, -1).join(" / ") || "Vault"}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
      <div className="dock-search">
        <Icon name="search" size={15} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { reset(); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Enter") {
              if (appResults[0]) openAppResult(appResults[0].id);
              else if (fileResults[0]) openFileResult(fileResults[0]);
            }
          }}
          placeholder="Search"
        />
      </div>
    </div>
  );
}
