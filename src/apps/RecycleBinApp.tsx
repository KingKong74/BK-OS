"use client";

import { useOS } from "@/os/store";
import { Icon } from "@/components/Icon";
import { fileIcon } from "@/os/vfs";

export function RecycleBinApp() {
  const items = useOS((s) => s.recycleBin);
  const restoreFromBin = useOS((s) => s.restoreFromBin);
  const permaDelete = useOS((s) => s.permaDelete);
  const emptyRecycleBin = useOS((s) => s.emptyRecycleBin);

  return (
    <div className="bin-app">
      <div className="bin-toolbar">
        <span className="bin-count">{items.length} item{items.length === 1 ? "" : "s"} in bin</span>
        <button
          className="bin-empty"
          disabled={items.length === 0}
          onClick={() => {
            if (items.length === 0) return;
            const fullPaths = items.map((i) => i.fullPath);
            fullPaths.forEach((p) => permaDelete(p));
            emptyRecycleBin();
          }}
        >
          Empty Recycle Bin
        </button>
      </div>
      {items.length === 0 ? (
        <div className="bin-empty-state">The Recycle Bin is empty.</div>
      ) : (
        <div className="bin-list">
          <div className="bin-head">
            <div>Name</div>
            <div>Original location</div>
            <div>Deleted</div>
            <div></div>
          </div>
          {items.map((it) => {
            const isFolder = it.node.type === "folder";
            const kind = it.node.type === "file" ? it.node.kind : "other";
            return (
              <div key={it.fullPath} className="bin-row">
                <div className="bin-name">
                  <Icon name={isFolder ? "folder" : fileIcon(kind as any)} size={15} />
                  <span>{it.node.name}</span>
                </div>
                <div className="bin-origin">{it.originalParent.join(" / ") || "Vault"}</div>
                <div className="bin-date">{new Date(it.deletedAt).toLocaleDateString()}</div>
                <div className="bin-actions">
                  <button onClick={() => restoreFromBin(it.fullPath)}>Restore</button>
                  <button className="bin-danger" onClick={() => permaDelete(it.fullPath)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
