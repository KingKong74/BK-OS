"use client";

import { useOS } from "@/os/store";

export function NotesApp() {
  const notes = useOS((s) => s.stickyNotes);
  const addNote = useOS((s) => s.addNote);
  const removeNote = useOS((s) => s.removeNote);
  const updateNote = useOS((s) => s.updateNote);
  const closeNote = useOS((s) => s.closeNote);
  const openNote = useOS((s) => s.openNote);

  const open = notes.filter((n) => !n.closed);
  const closed = notes.filter((n) => n.closed);

  return (
    <div className="notes-app">
      <div className="notes-toolbar">
        <button className="notes-add" onClick={() => addNote()}>New note</button>
        <span className="notes-count">
          {open.length} on desktop · {closed.length} closed
        </span>
      </div>
      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="notes-empty">
            No notes yet. Click <em>New note</em> or right-click the desktop and pick <em>New sticky note</em>.
          </div>
        ) : (
          <>
            {open.map((n) => (
              <div key={n.id} className={"notes-row color-" + (n.color ?? "yellow")}>
                <textarea
                  value={n.text}
                  placeholder="Empty note"
                  onChange={(e) => updateNote(n.id, e.target.value)}
                />
                <div className="notes-row-actions">
                  <span className="notes-row-status">On desktop</span>
                  <button className="notes-row-btn" onClick={() => closeNote(n.id)} title="Close on desktop">Close</button>
                  <button className="notes-row-btn is-danger" onClick={() => removeNote(n.id)} title="Delete forever">Delete</button>
                </div>
              </div>
            ))}
            {closed.length > 0 && <div className="notes-section-label">Closed</div>}
            {closed.map((n) => (
              <div key={n.id} className={"notes-row is-closed color-" + (n.color ?? "yellow")}>
                <textarea
                  value={n.text}
                  placeholder="Empty note"
                  onChange={(e) => updateNote(n.id, e.target.value)}
                />
                <div className="notes-row-actions">
                  <span className="notes-row-status">Closed</span>
                  <button className="notes-row-btn" onClick={() => openNote(n.id)} title="Reopen on desktop">Show on desktop</button>
                  <button className="notes-row-btn is-danger" onClick={() => removeNote(n.id)} title="Delete forever">Delete</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="notes-hint">
        X on a desktop note just <em>closes</em> it — the note stays here. Delete from this list to remove it for good.
      </div>
    </div>
  );
}
