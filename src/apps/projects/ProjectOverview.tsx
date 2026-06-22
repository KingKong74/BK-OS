"use client";

import { useEffect, useRef, useState } from "react";
import { saveReadme } from "./data";

interface Props {
  readmeId: string | null;
  initialContent: string;
  onSaved?: () => void;
}

export function ProjectOverview({ readmeId, initialContent, onSaved }: Props) {
  const [content, setContent] = useState(initialContent);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = useRef(initialContent);

  // Reset when project changes
  useEffect(() => {
    setContent(initialContent);
    initial.current = initialContent;
    setEditing(false);
    setSavedAt(null);
  }, [initialContent, readmeId]);

  const handleSave = async () => {
    if (!readmeId) return;
    if (content === initial.current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await saveReadme(readmeId, content);
      initial.current = content;
      setSavedAt(new Date());
      setEditing(false);
      onSaved?.();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("save readme failed:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!readmeId) {
    return <div className="proj-empty">This project has no README.md yet.</div>;
  }

  return (
    <div className="proj-overview">
      <div className="proj-section-toolbar">
        <h3 className="proj-section-title">Overview · README.md</h3>
        {editing ? (
          <button className="proj-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        ) : (
          <button className="proj-btn" onClick={() => setEditing(true)}>Edit</button>
        )}
        {savedAt && !editing && (
          <span className="proj-status">Saved {savedAt.toLocaleTimeString()}</span>
        )}
      </div>
      {editing ? (
        <textarea
          className="proj-readme-edit"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
      ) : (
        <div className="proj-readme-view">
          <pre>{content || "_(empty)_"}</pre>
        </div>
      )}
    </div>
  );
}
