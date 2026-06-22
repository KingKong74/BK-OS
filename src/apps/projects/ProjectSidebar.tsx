"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { createProject, deleteProject, listProjects } from "./data";
import type { ProjectSummary } from "./types";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onProjectsChanged?: () => void;
}

export function ProjectSidebar({ selectedId, onSelect, onProjectsChanged }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    listProjects()
      .then((rows) => {
        if (!alive) return;
        setProjects(rows);
        // Auto-select first project if nothing selected
        if (!selectedId && rows.length > 0) {
          onSelect(rows[0].id);
        }
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "load failed"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const refresh = () => {
    setVersion((v) => v + 1);
    onProjectsChanged?.();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    try {
      const p = await createProject(name);
      setNewName("");
      setCreating(false);
      refresh();
      onSelect(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  const handleDelete = async (p: ProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete project "${p.name}"? Files move to Recycle Bin.`)) return;
    try {
      await deleteProject(p.id);
      if (selectedId === p.id) onSelect("");
      refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "delete failed");
    }
  };

  return (
    <aside className="proj-sidebar">
      <div className="proj-sidebar-header">
        <span className="proj-sidebar-title">Projects</span>
        <button className="proj-sidebar-new" onClick={() => setCreating(true)} title="New project">
          +
        </button>
      </div>

      {creating && (
        <div className="proj-sidebar-newrow">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              else if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            onBlur={() => {
              if (!newName.trim()) { setCreating(false); }
            }}
          />
        </div>
      )}

      {error && <div className="proj-error proj-sidebar-error">{error}</div>}

      <div className="proj-sidebar-list">
        {loading && <div className="proj-empty proj-empty-tiny">Loading…</div>}
        {!loading && projects.length === 0 && !creating && (
          <div className="proj-empty proj-empty-tiny">
            <p>No projects yet.</p>
            <button className="proj-btn" onClick={() => setCreating(true)}>Create your first</button>
          </div>
        )}
        {projects.map((p) => (
          <button
            key={p.id}
            className={"proj-sidebar-item" + (selectedId === p.id ? " is-active" : "")}
            onClick={() => onSelect(p.id)}
          >
            <Icon name="folder" size={14} />
            <span className="proj-sidebar-name">{p.name}</span>
            <button
              className="proj-sidebar-del"
              onClick={(e) => handleDelete(p, e)}
              title="Delete"
            >
              <Icon name="close" size={10} />
            </button>
          </button>
        ))}
      </div>
    </aside>
  );
}
