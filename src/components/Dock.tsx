"use client";

import { useOS } from "@/os/store";
import { APPS, APP_MAP } from "@/os/appsMeta";
import { Icon } from "./Icon";

export function Dock() {
  const windows = useOS((s) => s.windows);
  const focusedId = useOS((s) => s.focusedId);
  const openApp = useOS((s) => s.openApp);
  const toggleLauncher = useOS((s) => s.toggleLauncher);
  const taskbarActivate = useOS((s) => s.taskbarActivate);

  const pinned = APPS.filter((a) => a.pinned);

  return (
    <div className="dock">
      <button className="dock-launcher" aria-label="Open launcher" onClick={() => toggleLauncher()}>
        <Icon name="grid" size={20} />
      </button>
      <span className="dock-divider" />
      {pinned.map((a) => (
        <button
          key={a.id}
          className="dock-app"
          aria-label={a.name}
          title={a.name}
          onClick={() => openApp(a.id)}
        >
          <span className="dock-tile" style={{ background: a.accent, color: a.accentFg }}>
            <Icon name={a.icon} size={20} />
          </span>
        </button>
      ))}

      {windows.length > 0 && (
        <>
          <span className="dock-divider" />
          <div className="dock-tasks">
            {windows.map((w) => {
              const meta = APP_MAP[w.appId];
              const active = focusedId === w.id && !w.minimized;
              return (
                <button
                  key={w.id}
                  className={"dock-task" + (active ? " is-active" : "") + (w.minimized ? " is-min" : "")}
                  onClick={() => taskbarActivate(w.id)}
                  title={meta?.name}
                >
                  {meta && <Icon name={meta.icon} size={15} />}
                  <span className="dock-task-label">{meta?.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
