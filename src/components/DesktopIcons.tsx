"use client";

import { useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { Icon } from "./Icon";

const DESKTOP_ICONS = ["vault", "projects", "settings"];

export function DesktopIcons() {
  const openApp = useOS((s) => s.openApp);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="desktop-icons" onPointerDown={() => setSelected(null)}>
      {DESKTOP_ICONS.map((id) => {
        const meta = APP_MAP[id];
        if (!meta) return null;
        return (
          <button
            key={id}
            className={"desktop-icon" + (selected === id ? " is-selected" : "")}
            onPointerDown={(e) => { e.stopPropagation(); setSelected(id); }}
            onDoubleClick={() => openApp(id)}
          >
            <span className="desktop-icon-tile" style={{ background: meta.accent, color: meta.accentFg }}>
              <Icon name={meta.icon} size={26} />
            </span>
            <span className="desktop-icon-label">{meta.name}</span>
          </button>
        );
      })}
    </div>
  );
}
