"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { saveLinks } from "./data";
import { genId, type Link } from "./types";

interface Props {
  linksFileId: string;
  initialLinks: Link[];
}

export function ProjectLinks({ linksFileId, initialLinks }: Props) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [status, setStatus] = useState("");
  const saveTimer = useRef<number | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    setLinks(initialLinks);
    firstLoad.current = true;
  }, [linksFileId, initialLinks]);

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (!linksFileId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("Saving…");
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveLinks(linksFileId, links);
        setStatus("Saved");
        setTimeout(() => setStatus(""), 1500);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "save failed");
      }
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [links, linksFileId]);

  const addLink = () => {
    const label = draftLabel.trim();
    const url = draftUrl.trim();
    if (!label || !url) return;
    setLinks((prev) => [...prev, { id: genId(), label, url }]);
    setDraftLabel("");
    setDraftUrl("");
  };

  const deleteLink = (id: string) =>
    setLinks((prev) => prev.filter((l) => l.id !== id));

  const startEdit = (link: Link) => {
    setEditingId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
  };
  const commitEdit = () => {
    if (!editingId) return;
    if (editLabel.trim() && editUrl.trim()) {
      setLinks((prev) =>
        prev.map((l) => (l.id === editingId ? { ...l, label: editLabel.trim(), url: editUrl.trim() } : l))
      );
    }
    setEditingId(null);
    setEditLabel("");
    setEditUrl("");
  };
  const cancelEdit = () => { setEditingId(null); setEditLabel(""); setEditUrl(""); };

  return (
    <div className="proj-links">
      <div className="proj-section-toolbar">
        <h3 className="proj-section-title">Links · {links.length}</h3>
        {status && <span className="proj-status">{status}</span>}
      </div>

      <div className="proj-link-add">
        <input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          placeholder="Label (e.g. GitHub)"
        />
        <input
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="https://…"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
        />
        <button className="proj-btn" onClick={addLink} disabled={!draftLabel.trim() || !draftUrl.trim()}>Add</button>
      </div>

      {links.length === 0 && (
        <div className="proj-empty"><p>No links yet. Pin URLs like GitHub repo, deploy, docs.</p></div>
      )}

      {links.length > 0 && (
        <ul className="proj-link-list">
          {links.map((link) => (
            <li key={link.id} className="proj-link-row">
              {editingId === link.id ? (
                <div className="proj-link-edit">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                  <button className="proj-btn" onClick={commitEdit}>Save</button>
                  <button className="proj-btn proj-btn-secondary" onClick={cancelEdit}>Cancel</button>
                </div>
              ) : (
                <>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proj-link-anchor"
                    title={link.url}
                  >
                    <Icon name="external-link" size={13} />
                    <span className="proj-link-label">{link.label}</span>
                    <span className="proj-link-url">{shortenUrl(link.url)}</span>
                  </a>
                  <button className="proj-icon-btn" title="Edit" onClick={() => startEdit(link)}>
                    <Icon name="refresh" size={12} />
                  </button>
                  <button className="proj-icon-btn" title="Delete" onClick={() => deleteLink(link.id)}>
                    <Icon name="close" size={12} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
