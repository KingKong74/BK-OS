"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { Icon } from "@/components/Icon";
import { createDoc, listDocs } from "./data";
import { deleteFsNode, type FsNodeDTO } from "@/hooks/useFs";

interface Props {
  docsFolderId: string | null;
}

export function ProjectDocs({ docsFolderId }: Props) {
  const [docs, setDocs] = useState<FsNodeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [version, setVersion] = useState(0);
  const openApp = useOS((s) => s.openApp);
  const setNotepadInitial = useOS((s) => s.setNotepadInitial);

  useEffect(() => {
    if (!docsFolderId) { setDocs([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    listDocs(docsFolderId)
      .then((rows) => { if (alive) setDocs(rows.sort((a, b) => a.name.localeCompare(b.name))); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "load docs failed"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [docsFolderId, version]);

  const refresh = () => setVersion((v) => v + 1);

  const handleCreate = async () => {
    if (!docsFolderId || !newName.trim()) { setCreating(false); return; }
    let name = newName.trim();
    if (!name.endsWith(".md")) name += ".md";
    try {
      await createDoc(docsFolderId, name);
      setNewName("");
      setCreating(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  const openDoc = (doc: FsNodeDTO) => {
    setNotepadInitial({ path: [doc.id], name: doc.name });
    openApp("notepad");
  };

  const deleteDoc = async (doc: FsNodeDTO) => {
    if (!confirm(`Delete ${doc.name}?`)) return;
    try {
      await deleteFsNode(doc.id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    }
  };

  if (!docsFolderId) {
    return <div className="proj-empty">This project has no docs/ folder.</div>;
  }

  return (
    <div className="proj-docs">
      <div className="proj-section-toolbar">
        <h3 className="proj-section-title">Docs · docs/</h3>
        {creating ? (
          <div className="proj-inline-input">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="filename.md"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
                else if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
            />
            <button className="proj-btn" onClick={handleCreate}>Add</button>
            <button className="proj-btn proj-btn-secondary" onClick={() => { setCreating(false); setNewName(""); }}>Cancel</button>
          </div>
        ) : (
          <button className="proj-btn" onClick={() => setCreating(true)}>+ New doc</button>
        )}
      </div>
      {error && <div className="proj-error">{error}</div>}
      {loading && <div className="proj-empty">Loading…</div>}
      {!loading && docs.length === 0 && !creating && (
        <div className="proj-empty">
          <p>No docs yet. Markdown files in <code>docs/</code> appear here.</p>
        </div>
      )}
      {!loading && docs.length > 0 && (
        <ul className="proj-doc-list">
          {docs.map((doc) => (
            <li key={doc.id} className="proj-doc-row">
              <button className="proj-doc-link" onClick={() => openDoc(doc)} title="Open in Notepad">
                <Icon name="notes" size={14} />
                <span className="proj-doc-name">{doc.name}</span>
              </button>
              <button className="proj-icon-btn" title="Delete" onClick={() => deleteDoc(doc)}>
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
