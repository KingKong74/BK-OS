"use client";

import { useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { MENUBAR_H } from "@/os/types";
import { Icon } from "./Icon";

const DESKTOP_ICONS = ["vault", "moniqr", "projects", "settings"];
const CELL_W = 88;
const CELL_H = 98;
const ORIGIN_X = 16;
const ORIGIN_Y = MENUBAR_H + 14;

function defaultPos(index: number) {
  return { x: ORIGIN_X, y: ORIGIN_Y + index * CELL_H };
}

function snapToGrid(x: number, y: number) {
  const col = Math.max(0, Math.round((x - ORIGIN_X) / CELL_W));
  const row = Math.max(0, Math.round((y - ORIGIN_Y) / CELL_H));
  let sx = ORIGIN_X + col * CELL_W;
  let sy = ORIGIN_Y + row * CELL_H;
  if (typeof window !== "undefined") {
    sx = Math.min(sx, window.innerWidth - 90);
    sy = Math.min(sy, window.innerHeight - 130);
  }
  return { x: Math.max(0, sx), y: Math.max(ORIGIN_Y, sy) };
}

export function DesktopIcons() {
  const openApp = useOS((s) => s.openApp);
  const openMenu = useOS((s) => s.openMenu);
  const iconPositions = useOS((s) => s.iconPositions);
  const setIconPosition = useOS((s) => s.setIconPosition);
  const gridSnap = useOS((s) => s.gridSnap);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean; cx: number; cy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent, id: string, pos: { x: number; y: number }) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(id);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y, moved: false, cx: pos.x, cy: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent, id: string) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 4) return;
    drag.current.moved = true;
    const nx = drag.current.ox + dx;
    const ny = drag.current.oy + dy;
    drag.current.cx = nx;
    drag.current.cy = ny;
    setIconPosition(id, nx, ny);
  };
  const onPointerUp = (e: React.PointerEvent, id: string) => {
    if (drag.current?.moved && gridSnap) {
      const snapped = snapToGrid(drag.current.cx, drag.current.cy);
      setIconPosition(id, snapped.x, snapped.y);
    }
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <>
      {DESKTOP_ICONS.map((id, i) => {
        const meta = APP_MAP[id];
        if (!meta) return null;
        const pos = iconPositions[id] ?? defaultPos(i);
        return (
          <button
            key={id}
            className={"desktop-icon" + (selected === id ? " is-selected" : "")}
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(e) => onPointerDown(e, id, pos)}
            onPointerMove={(e) => onPointerMove(e, id)}
            onPointerUp={(e) => onPointerUp(e, id)}
            onDoubleClick={() => openApp(id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelected(id);
              openMenu(e.clientX, e.clientY, [
                { label: "Open", icon: meta.icon, onSelect: () => openApp(id) },
                { separator: true },
                { label: "Get info", disabled: true },
              ]);
            }}
          >
            <span className="desktop-icon-tile" style={{ background: meta.accent, color: meta.accentFg }}>
              <Icon name={meta.icon} size={26} />
            </span>
            <span className="desktop-icon-label">{meta.name}</span>
          </button>
        );
      })}
    </>
  );
}
