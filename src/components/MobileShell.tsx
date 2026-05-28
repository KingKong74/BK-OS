"use client";

import { useState } from "react";
import { useOS } from "@/os/store";
import { APPS, APP_MAP } from "@/os/appsMeta";
import { renderApp } from "@/os/registry";
import { Icon } from "./Icon";

export function MobileShell() {
  const focusedId = useOS((s) => s.focusedId);
  const windows = useOS((s) => s.windows);
  const openApp = useOS((s) => s.openApp);
  const [home, setHome] = useState(true);

  const focused = windows.find((w) => w.id === focusedId);
  const activeAppId = focused?.appId ?? null;
  const showHome = home || !activeAppId;

  const open = (id: string) => {
    openApp(id);
    setHome(false);
  };

  const pinned = APPS.filter((a) => a.pinned);

  return (
    <div className="mobile">
      {showHome ? (
        <div className="mobile-home">
          <div className="mobile-clock">bailey.os</div>
          <div className="mobile-grid">
            {APPS.map((a) => (
              <button key={a.id} className="mobile-app" onClick={() => open(a.id)}>
                <span className="mobile-tile" style={{ background: a.accent, color: a.accentFg }}>
                  <Icon name={a.icon} size={26} />
                </span>
                <span className="mobile-name">{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mobile-app-view">
          <div className="mobile-appbar">{activeAppId && APP_MAP[activeAppId]?.name}</div>
          <div className="mobile-app-body">{activeAppId && renderApp(activeAppId)}</div>
        </div>
      )}

      <div className="mobile-tabbar">
        <button className={"mobile-tab" + (showHome ? " is-active" : "")} onClick={() => setHome(true)} aria-label="Home">
          <Icon name="grid" size={22} />
        </button>
        {pinned.map((a) => (
          <button
            key={a.id}
            className={"mobile-tab" + (!showHome && activeAppId === a.id ? " is-active" : "")}
            onClick={() => open(a.id)}
            aria-label={a.name}
          >
            <Icon name={a.icon} size={22} />
          </button>
        ))}
      </div>
    </div>
  );
}
