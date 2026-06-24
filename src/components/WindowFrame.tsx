"use client";

import { useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { renderApp } from "@/os/registry";
import { zoneFromPoint } from "@/os/snap";
import { MENUBAR_H, type SnapZone, type WindowState } from "@/os/types";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";

export function WindowFrame({ win }: { win: WindowState }) {
  const meta = APP_MAP[win.appId];
  const focusedId = useOS((s) => s.focusedId);
  const {
    focusWindow,
    moveWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    setBounds,
    applySnap,
    setSnapPreview,
    openMenu,
  } = useOS();

  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const edgeResize = useRef<{
    edge: string; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number;
  } | null>(null);
  const pendingBounds = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
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

  // 8-direction edge resize. edge is a string containing 'n'/'s'/'e'/'w'.
  const onEdgeDown = (edge: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(win.id);
    edgeResize.current = {
      edge,
      sx: e.clientX, sy: e.clientY,
      ox: win.x, oy: win.y, ow: win.width, oh: win.height,
    };
    setInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onEdgeMove = (e: React.PointerEvent) => {
    const r = edgeResize.current;
    if (!r) return;
    const MIN_W = 280, MIN_H = 180;
    const dx = e.clientX - r.sx;
    const dy = e.clientY - r.sy;
    let nx = r.ox, ny = r.oy, nw = r.ow, nh = r.oh;
    if (r.edge.includes("e")) {
      nw = Math.max(MIN_W, r.ow + dx);
    }
    if (r.edge.includes("w")) {
      const cdx = Math.min(dx, r.ow - MIN_W);
      nx = r.ox + cdx;
      nw = r.ow - cdx;
    }
    if (r.edge.includes("s")) {
      nh = Math.max(MIN_H, r.oh + dy);
    }
    if (r.edge.includes("n")) {
      const cdy = Math.min(dy, r.oh - MIN_H);
      ny = Math.max(MENUBAR_H, r.oy + cdy);
      nh = r.oh - cdy;
    }
    // Imperatively style the window for smooth resize (no React re-render per frame)
    const el = rootRef.current;
    if (el) {
      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;
      el.style.width = `${nw}px`;
      el.style.height = `${nh}px`;
    }
    pendingBounds.current = { x: nx, y: ny, width: nw, height: nh };
  };
  const endEdge = (e: React.PointerEvent) => {
    // Commit accumulated bounds to the store once
    if (pendingBounds.current) {
      setBounds(win.id, pendingBounds.current, null);
      pendingBounds.current = null;
    }
    edgeResize.current = null;
    setInteracting(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const isFocused = focusedId === win.id;

  return (
    <div
      ref={rootRef}
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
          {/* App icon derives from the same manifest source as the dock /
              launcher / desktop (AppIcon), so it's consistent everywhere.
              Slightly smaller when maximised, larger when restored. */}
          {meta && <AppIcon id={win.appId} size={win.maximized ? 13 : 15} />}
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
        <>
          <div className="window-edge edge-n" onPointerDown={onEdgeDown("n")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-s" onPointerDown={onEdgeDown("s")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-w" onPointerDown={onEdgeDown("w")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-e" onPointerDown={onEdgeDown("e")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-nw" onPointerDown={onEdgeDown("nw")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-ne" onPointerDown={onEdgeDown("ne")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-sw" onPointerDown={onEdgeDown("sw")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
          <div className="window-edge edge-se window-resize" onPointerDown={onEdgeDown("se")} onPointerMove={onEdgeMove} onPointerUp={endEdge} onPointerCancel={endEdge} aria-hidden="true" />
        </>
      )}
    </div>
  );
}
