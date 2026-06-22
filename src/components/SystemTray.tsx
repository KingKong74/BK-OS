"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { Icon } from "./Icon";

/**
 * System tray. Sits at the right end of the dock, before the clock.
 * Built-in widgets:
 *   - Theme toggle (sun/moon)
 *   - Lock screen quick action
 *   - Clock (separately rendered by the menubar already)
 *
 * Addons declare hasTrayWidget=true in their manifest and contribute
 * their own widget here (future work).
 */
export function SystemTray() {
  const scene = useOS((s) => s.scene);
  const setScene = useOS((s) => s.setScene);
  const lock = useOS((s) => s.lock);
  const setCommandPaletteOpen = useOS((s) => s.setCommandPaletteOpen);

  const [time, setTime] = useState(() => formatTime(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="system-tray">
      <button
        className="tray-btn"
        title="Command palette (Ctrl+K)"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Icon name="search" size={14} />
      </button>
      <button
        className="tray-btn"
        title={scene === "win98" ? "Switch to Win98 at Night" : "Switch to Retro 98"}
        onClick={() => setScene(scene === "win98" ? "win98-dark" : "win98")}
      >
        <Icon name={scene === "win98" ? "moon" : "sun"} size={14} />
      </button>
      <button className="tray-btn" title="Lock" onClick={lock}>
        <Icon name="lock" size={14} />
      </button>
      <span className="tray-clock">{time}</span>
    </div>
  );
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
