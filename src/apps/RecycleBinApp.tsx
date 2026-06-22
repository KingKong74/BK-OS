"use client";

import { useEffect, useState } from "react";
import { FolderImg, FileImg } from "@/components/FsIcons";
import {
  listRecycled,
  restoreFsNode,
  permaDeleteFsNode,
  formatSize,
  formatDate,
  kindLabel,
  type FsNodeDTO,
} from "@/hooks/useFs";

export function RecycleBinApp() {
  const [items, setItems] = useState<FsNodeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listRecycled()
      .then((rows) => { if (alive) setItems(rows); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "load failed"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [version]);

  const refresh = () => setVersion((v) => v + 1);

  const restore = async (id: string) => {
    try {
      await restoreFsNode(id);
      refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "restore failed"); }
  };
  const permaDel = async (id: string) => {
    if (!confirm("Permanently delete this? Can't be undone.")) return;
    try {
      await permaDeleteFsNode(id);
      refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "delete failed"); }
  };
  const emptyAll = async () => {
    if (items.length === 0) return;
    if (!confirm(`Permanently delete all ${items.length} item${items.length === 1 ? "" : "s"}?`)) return;
    for (const it of items) {
      try { await permaDeleteFsNode(it.id); } catch { /* keep going */ }
    }
    refresh();
  };

  return (
    <div className="recycle-app">
      <div className="recycle-toolbar">
        <button onClick={emptyAll} disabled={items.length === 0}>Empty Recycle Bin</button>
        <button onClick={refresh}>Refresh</button>
        <span className="recycle-count">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>
      {error && <div className="recycle-error">{error}</div>}
      <div className="recycle-body">
        {loading && <div className="recycle-empty">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="recycle-empty">
            <FolderImg size={48} />
            <p>The Recycle Bin is empty.</p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <table className="recycle-list">
            <thead>
              <tr>
                <th>Name</th>
                <th>Original parent</th>
                <th>Type</th>
                <th>Size</th>
                <th>Deleted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {n.type === "folder" ? <FolderImg size={16} /> : <FileImg size={16} kind={n.kind} />}
                      {n.name}
                    </span>
                  </td>
                  <td>{n.recycledFromParentId ? "(folder)" : "(top level)"}</td>
                  <td>{kindLabel(n)}</td>
                  <td>{n.type === "file" ? formatSize(n.sizeBytes) : "—"}</td>
                  <td>{n.recycledAt ? formatDate(n.recycledAt) : "—"}</td>
                  <td>
                    <button onClick={() => restore(n.id)}>Restore</button>{" "}
                    <button onClick={() => permaDel(n.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
