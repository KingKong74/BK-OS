"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP, APPS } from "@/os/appsMeta";
import { AppIcon } from "@/components/AppIcon";

export function TaskManagerApp() {
  const windows = useOS((s) => s.windows);
  const focusedId = useOS((s) => s.focusedId);
  const focusWindow = useOS((s) => s.focusWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const scene = useOS((s) => s.scene);
  const stickyNotes = useOS((s) => s.stickyNotes);
  const recycleBin = useOS((s) => s.recycleBin);

  const [tab, setTab] = useState<"processes" | "performance">("processes");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1500);
    return () => clearInterval(t);
  }, []);

  // Fake CPU/memory values that drift mildly to feel alive
  const cpu = 12 + ((Math.sin(tick / 3) + 1) / 2) * 14 + windows.length * 3;
  const mem = 38 + ((Math.cos(tick / 4) + 1) / 2) * 8 + windows.length * 2;

  return (
    <div className="tm-app">
      <div className="tm-tabs">
        <button className={"tm-tab" + (tab === "processes" ? " is-active" : "")} onClick={() => setTab("processes")}>
          Processes
        </button>
        <button className={"tm-tab" + (tab === "performance" ? " is-active" : "")} onClick={() => setTab("performance")}>
          Performance
        </button>
      </div>

      {tab === "processes" && (
        <div className="tm-body">
          <div className="tm-head">
            <div>Task</div>
            <div>Status</div>
            <div></div>
          </div>
          {windows.length === 0 ? (
            <div className="tm-empty">No running tasks.</div>
          ) : (
            windows.map((w) => {
              const meta = APP_MAP[w.appId];
              const active = focusedId === w.id && !w.minimized;
              return (
                <div key={w.id} className="tm-row">
                  <div className="tm-task">
                    <AppIcon id={w.appId} size={18} />
                    <span>{meta?.name ?? w.appId}</span>
                  </div>
                  <div className="tm-status">
                    {active ? "Running" : w.minimized ? "Minimized" : "Background"}
                  </div>
                  <div className="tm-actions">
                    <button onClick={() => focusWindow(w.id)}>Focus</button>
                    <button onClick={() => minimizeWindow(w.id)} disabled={w.minimized}>Minimize</button>
                    <button className="tm-danger" onClick={() => closeWindow(w.id)}>End task</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "performance" && (
        <div className="tm-perf">
          <div className="tm-meter">
            <div className="tm-meter-label">CPU</div>
            <div className="tm-meter-bar"><div className="tm-meter-fill" style={{ width: `${Math.min(100, cpu).toFixed(1)}%` }} /></div>
            <div className="tm-meter-value">{cpu.toFixed(1)}%</div>
          </div>
          <div className="tm-meter">
            <div className="tm-meter-label">Memory</div>
            <div className="tm-meter-bar"><div className="tm-meter-fill" style={{ width: `${Math.min(100, mem).toFixed(1)}%` }} /></div>
            <div className="tm-meter-value">{mem.toFixed(1)}%</div>
          </div>
          <div className="tm-info">
            <div><span>OS</span><span>bailey.os 1.0</span></div>
            <div><span>Scene</span><span>{scene}</span></div>
            <div><span>Apps installed</span><span>{APPS.length}</span></div>
            <div><span>Windows open</span><span>{windows.length}</span></div>
            <div><span>Sticky notes</span><span>{stickyNotes.length}</span></div>
            <div><span>Items in bin</span><span>{recycleBin.length}</span></div>
          </div>
          <div className="tm-note">CPU and Memory values are illustrative — there's no real process telemetry in the browser.</div>
        </div>
      )}
    </div>
  );
}
