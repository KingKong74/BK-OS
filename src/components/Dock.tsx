"use client";

import { useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";
import { DockSearch } from "./DockSearch";
import { SystemTray } from "./SystemTray";

export function Dock() {
  const windows = useOS((s) => s.windows);
  const focusedId = useOS((s) => s.focusedId);
  const dockStyle = useOS((s) => s.dockStyle);
  const pinnedApps = useOS((s) => s.pinnedApps);
  const openApp = useOS((s) => s.openApp);
  const toggleLauncher = useOS((s) => s.toggleLauncher);
  const toggleTaskView = useOS((s) => s.toggleTaskView);
  const taskbarActivate = useOS((s) => s.taskbarActivate);
  const closeWindow = useOS((s) => s.closeWindow);
  const openMenu = useOS((s) => s.openMenu);
  const togglePin = useOS((s) => s.togglePin);
  const setPinnedOrder = useOS((s) => s.setPinnedOrder);
  const setWindowOrder = useOS((s) => s.setWindowOrder);

  const pinRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; moved: boolean } | null>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const taskDrag = useRef<{ id: string; x: number; moved: boolean } | null>(null);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);

  // Drag-reorder running task buttons within the tasks group only.
  const reorderTaskTo = (clientX: number, id: string) => {
    const cont = taskRef.current;
    if (!cont) return;
    const btns = Array.from(cont.querySelectorAll<HTMLElement>("[data-task]"));
    let target = btns.length - 1;
    for (let i = 0; i < btns.length; i++) {
      const r = btns[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) { target = i; break; }
    }
    const order = windows.map((w) => w.id);
    const cur = order.indexOf(id);
    if (cur === -1 || target === cur) return;
    order.splice(cur, 1);
    order.splice(target, 0, id);
    setWindowOrder(order);
  };
  const onTaskDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    taskDrag.current = { id, x: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTaskMove = (e: React.PointerEvent, id: string) => {
    if (!taskDrag.current) return;
    if (!taskDrag.current.moved && Math.abs(e.clientX - taskDrag.current.x) < 5) return;
    if (!taskDrag.current.moved) setDraggingTask(id);
    taskDrag.current.moved = true;
    reorderTaskTo(e.clientX, id);
  };
  const onTaskUp = (e: React.PointerEvent, id: string) => {
    if (!taskDrag.current) return;
    const moved = taskDrag.current.moved;
    taskDrag.current = null;
    setDraggingTask(null);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!moved) taskbarActivate(id);
  };

  const reorderTo = (clientX: number, id: string) => {
    const cont = pinRef.current;
    if (!cont) return;
    const tiles = Array.from(cont.querySelectorAll<HTMLElement>("[data-pin]"));
    let target = tiles.length - 1;
    for (let i = 0; i < tiles.length; i++) {
      const r = tiles[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) { target = i; break; }
    }
    const cur = pinnedApps.indexOf(id);
    if (cur === -1 || target === cur) return;
    const next = [...pinnedApps];
    next.splice(cur, 1);
    next.splice(target, 0, id);
    setPinnedOrder(next);
  };

  const onPinDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    drag.current = { id, x: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPinMove = (e: React.PointerEvent, id: string) => {
    if (!drag.current) return;
    if (!drag.current.moved && Math.abs(e.clientX - drag.current.x) < 5) return;
    drag.current.moved = true;
    reorderTo(e.clientX, id);
  };
  const onPinUp = (e: React.PointerEvent, id: string) => {
    if (!drag.current) return; // not a left-click sequence — context menu / aux click
    const moved = drag.current.moved;
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!moved) openApp(id);
  };

  const appMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const pinned = pinnedApps.includes(id);
    openMenu(e.clientX, e.clientY, [
      { label: "Open", icon: APP_MAP[id]?.icon, onSelect: () => openApp(id) },
      { separator: true },
      { label: pinned ? "Unpin from taskbar" : "Pin to taskbar", onSelect: () => togglePin(id) },
    ]);
  };

  return (
    <div className="dock" data-dock={dockStyle}>
      <button className="dock-launcher" aria-label="Start" onClick={() => toggleLauncher()}>
        <AppIcon id="_start" size={22} />
        <span className="dock-launcher-label">Start</span>
      </button>
      <DockSearch />
      <button className="dock-taskview" aria-label="Task view" onClick={() => toggleTaskView()}>
        <Icon name="taskview" size={23} />
      </button>

      <span className="dock-divider" />

      <div className="dock-pins" ref={pinRef}>
        {pinnedApps.map((id) => {
          const meta = APP_MAP[id];
          if (!meta) return null;
          const isRunning = windows.some((w) => w.appId === id);
          const isActive = windows.some((w) => w.id === focusedId && w.appId === id && !w.minimized);
          return (
            <button
              key={id}
              data-pin={id}
              className={"dock-app" + (isRunning ? " is-running" : "") + (isActive ? " is-active" : "")}
              aria-label={meta.name}
              title={meta.name}
              onPointerDown={(e) => onPinDown(e, id)}
              onPointerMove={(e) => onPinMove(e, id)}
              onPointerUp={(e) => onPinUp(e, id)}
              onContextMenu={(e) => appMenu(e, id)}
            >
              <span className="dock-tile">
                <AppIcon id={id} size={26} />
              </span>
            </button>
          );
        })}
      </div>

      {windows.length > 0 && <span className="dock-divider" />}

      <div className="dock-tasks" ref={taskRef}>
        {windows.length > 0 && (
          <>
            {windows.map((w) => {
              const meta = APP_MAP[w.appId];
              const active = focusedId === w.id && !w.minimized;
              const pinned = pinnedApps.includes(w.appId);
              return (
                <button
                  key={w.id}
                  data-task={w.id}
                  className={"dock-task" + (active ? " is-active" : "") + (w.minimized ? " is-min" : "") + (draggingTask === w.id ? " is-dragging" : "")}
                  onPointerDown={(e) => onTaskDown(e, w.id)}
                  onPointerMove={(e) => onTaskMove(e, w.id)}
                  onPointerUp={(e) => onTaskUp(e, w.id)}
                  title={meta?.name}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(e.clientX, e.clientY, [
                      { label: w.minimized ? "Restore" : "Focus", onSelect: () => taskbarActivate(w.id) },
                      { label: pinned ? "Unpin from taskbar" : "Pin to taskbar", onSelect: () => togglePin(w.appId) },
                      { separator: true },
                      { label: "Close", danger: true, onSelect: () => closeWindow(w.id) },
                    ]);
                  }}
                >
                  {meta && <AppIcon id={w.appId} size={17} />}
                  <span className="dock-task-label">{meta?.name}</span>
                </button>
              );
            })}
          </>
        )}
      </div>
      <SystemTray />
    </div>
  );
}
