"use client";

import { useRef, useState } from "react";
import { useOS } from "@/os/store";
import { MENUBAR_H } from "@/os/types";
import type { NoteColor } from "@/os/store";

const COLORS: { id: NoteColor; label: string }[] = [
  { id: "yellow", label: "Yellow" },
  { id: "pink", label: "Pink" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "orange", label: "Orange" },
];

export function StickyNotes() {
  const notes = useOS((s) => s.stickyNotes);
  const moveNote = useOS((s) => s.moveNote);
  const updateNote = useOS((s) => s.updateNote);
  const closeNote = useOS((s) => s.closeNote);
  const removeNote = useOS((s) => s.removeNote);
  const setNoteColor = useOS((s) => s.setNoteColor);
  const drag = useRef<Record<string, { x: number; y: number; ox: number; oy: number; moved: boolean }>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const visible = notes.filter((n) => !n.closed);

  return (
    <>
      {visible.map((n, i) => {
        const x = n.x ?? 140 + (i % 6) * 30;
        const y = n.y ?? 140 + (i % 6) * 30;
        const color = n.color ?? "yellow";
        return (
          <div
            key={n.id}
            className={"sticky-note-floating color-" + color}
            style={{ left: x, top: y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="sticky-note-header"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                drag.current[n.id] = { x: e.clientX, y: e.clientY, ox: x, oy: y, moved: false };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const d = drag.current[n.id];
                if (!d) return;
                const dx = e.clientX - d.x;
                const dy = e.clientY - d.y;
                if (!d.moved && Math.hypot(dx, dy) < 3) return;
                d.moved = true;
                moveNote(n.id, d.ox + dx, Math.max(MENUBAR_H + 2, d.oy + dy));
              }}
              onPointerUp={(e) => {
                delete drag.current[n.id];
                try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
              }}
            >
              <button
                className="sticky-more"
                aria-label="Note options"
                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === n.id ? null : n.id); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                …
              </button>
              <button
                className="sticky-close"
                aria-label="Close note"
                title="Close (keeps the note — manage in the Notes app)"
                onClick={() => closeNote(n.id)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                ×
              </button>
              {openMenu === n.id && (
                <>
                  <div className="sticky-menu-backdrop" onClick={() => setOpenMenu(null)} />
                  <div className="sticky-menu" onPointerDown={(e) => e.stopPropagation()}>
                    <div className="sticky-menu-label">Colour</div>
                    <div className="sticky-swatches">
                      {COLORS.map((c) => (
                        <button
                          key={c.id}
                          className={"sticky-swatch color-" + c.id + (color === c.id ? " is-active" : "")}
                          title={c.label}
                          onClick={() => { setNoteColor(n.id, c.id); setOpenMenu(null); }}
                        />
                      ))}
                    </div>
                    <div className="sticky-menu-sep" />
                    <button
                      className="sticky-menu-item is-danger"
                      onClick={() => { removeNote(n.id); setOpenMenu(null); }}
                    >Delete forever</button>
                  </div>
                </>
              )}
            </div>
            <textarea
              value={n.text}
              placeholder="Type here…"
              onChange={(e) => updateNote(n.id, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        );
      })}
    </>
  );
}
