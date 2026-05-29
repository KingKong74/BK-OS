"use client";

import { useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { renderApp } from "@/os/registry";
import { zoneFromPoint } from "@/os/snap";
import { MENUBAR_H, type SnapZone, type WindowState } from "@/os/types";
import { Icon } from "./Icon";

export function WindowFrame({ win }: { win: WindowState }) {
  const meta = APP_MAP[win.appId];
  const focusedId = useOS((s) => s.focusedId);
  const {
    focusWindow,
    moveWindow,
    resizeWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    setBounds,
    applySnap,
    setSnapPreview,
    openMenu,
  } = useOS();

  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; ow: number; oh: number } | null>(null);
  const dragZone = useRef<SnapZone | null>(null);
  const [interacting, setInteracting] = useState(false);

  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (win.maximized) return;
    focusWindow(win.id);
    let ox = win.x;
    let oy = win.y;

    // Dragging a snapped window pops it back to its previous size under the cursor.
    if (win.snap) {
      const size = win.prev ?? meta?.defaultSize ?? { width: 720, height: 480 };
      ox = Math.max(0, Math.round(e.clientX - size.width / 2));
      oy = MENUBAR_H + 6;
      setBounds(win.id, { x: ox, y: oy, width: size.width, height: size.height }, null);
    }

    drag.current = { x: e.clientX, y: e.clientY, ox, oy };
    setInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onTitlePointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    moveWindow(
      win.id,
      drag.current.ox + (e.clientX - drag.current.x),
      drag.current.oy + (e.clientY - drag.current.y)
    );
    const zone = zoneFromPoint(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    if (zone !== dragZone.current) {
      dragZone.current = zone;
      setSnapPreview(zone);
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragZone.current) applySnap(win.id, dragZone.current);
    dragZone.current = null;
    setSnapPreview(null);
    drag.current = null;
    setInteracting(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(win.id);
    resize.current = { x: e.clientX, y: e.clientY, ow: win.width, oh: win.height };
    setInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!resize.current) return;
    resizeWindow(
      win.id,
      resize.current.ow + (e.clientX - resize.current.x),
      resize.current.oh + (e.clientY - resize.current.y)
    );
  };
  const endResize = (e: React.PointerEvent) => {
    resize.current = null;
    setInteracting(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const isFocused = focusedId === win.id;

  return (
    <div
      className={
        "window" +
        (isFocused ? " is-focused" : "") +
        (win.maximized ? " is-max" : "") +
        (win.minimized ? " is-minimized" : "") +
        (interacting ? " is-interacting" : "")
      }
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      onPointerDown={() => focusWindow(win.id)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      role="dialog"
      aria-label={meta?.name}
    >
      <div
        className="window-titlebar"
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => toggleMaximize(win.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openMenu(e.clientX, e.clientY, [
            { label: "Minimize", icon: "minimize", onSelect: () => minimizeWindow(win.id) },
            { label: win.maximized ? "Restore" : "Maximize", icon: "maximize", onSelect: () => toggleMaximize(win.id) },
            { separator: true },
            { label: "Close", icon: "close", danger: true, onSelect: () => closeWindow(win.id) },
          ]);
        }}
      >
        <span className="window-title">
          {meta && <Icon name={meta.icon} size={14} />}
          {meta?.name}
        </span>
        <span className="window-controls">
          <button aria-label="Minimize" onPointerDown={(e) => e.stopPropagation()} onClick={() => minimizeWindow(win.id)}>
            <Icon name="minimize" size={13} />
          </button>
          <button aria-label="Maximize" onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleMaximize(win.id)}>
            <Icon name="maximize" size={12} />
          </button>
          <button className="ctl-close" aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={() => closeWindow(win.id)}>
            <Icon name="close" size={13} />
          </button>
        </span>
      </div>
      <div className="window-body">{renderApp(win.appId)}</div>
      {!win.maximized && (
        <div
          className="window-resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
