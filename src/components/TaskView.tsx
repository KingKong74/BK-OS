"use client";

import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { Icon } from "./Icon";

export function TaskView() {
  const windows = useOS((s) => s.windows);
  const focusWindow = useOS((s) => s.focusWindow);
  const toggleTaskView = useOS((s) => s.toggleTaskView);

  const pick = (id: string) => {
    focusWindow(id);
    toggleTaskView(false);
  };

  return (
    <div className="taskview" onPointerDown={() => toggleTaskView(false)}>
      <div className="taskview-inner" onPointerDown={(e) => e.stopPropagation()}>
        {windows.length === 0 ? (
          <div className="taskview-empty">No open windows. Open something from the dock or launcher.</div>
        ) : (
          <div className="taskview-grid">
            {windows.map((w) => {
              const meta = APP_MAP[w.appId];
              return (
                <button key={w.id} className="taskview-card" onClick={() => pick(w.id)}>
                  <span className="taskview-thumb" style={{ background: meta?.accent, color: meta?.accentFg }}>
                    {meta && <Icon name={meta.icon} size={30} />}
                  </span>
                  <span className="taskview-title">{meta?.name}{w.minimized ? " · minimized" : ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
