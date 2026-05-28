"use client";

import { useState } from "react";
import { useOS } from "@/os/store";
import { APPS } from "@/os/appsMeta";
import { Icon } from "./Icon";

export function Launcher() {
  const openApp = useOS((s) => s.openApp);
  const toggleLauncher = useOS((s) => s.toggleLauncher);
  const [q, setQ] = useState("");

  const results = APPS.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="launcher-overlay" onClick={() => toggleLauncher(false)}>
      <div className="launcher" onClick={(e) => e.stopPropagation()}>
        <div className="launcher-search">
          <Icon name="search" size={17} />
          <input
            autoFocus
            placeholder="Search apps and files"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) openApp(results[0].id);
              if (e.key === "Escape") toggleLauncher(false);
            }}
          />
        </div>
        <div className="launcher-label">Apps</div>
        <div className="launcher-grid">
          {results.map((a) => (
            <button key={a.id} className="launcher-app" onClick={() => openApp(a.id)}>
              <span className="launcher-tile" style={{ background: a.accent, color: a.accentFg }}>
                <Icon name={a.icon} size={24} />
              </span>
              <span className="launcher-name">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
