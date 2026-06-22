"use client";

import { useOS } from "@/os/store";
import type { ThemeId } from "@/os/types";

const THEMES: { id: ThemeId; name: string; blurb: string; swatch: { bg: string; window: string; title: string } }[] = [
  {
    id: "win98",
    name: "Retro 98",
    blurb: "Bright teal desktop, silver chrome, classic Win98 bevels.",
    swatch: { bg: "#008080", window: "#c0c0c0", title: "#000080" },
  },
  {
    id: "win98-dark",
    name: "Win98 at Night",
    blurb: "Same shapes, lights off. Easy on the eyes after dark.",
    swatch: { bg: "#1a1a2e", window: "#2a2a32", title: "#1a3a6a" },
  },
];

export function SettingsApp() {
  const scene = useOS((s) => s.scene);
  const setScene = useOS((s) => s.setScene);
  const gridSnap = useOS((s) => s.gridSnap);
  const setGridSnap = useOS((s) => s.setGridSnap);

  return (
    <div className="settings-app">
      <h2>Appearance</h2>
      <p className="settings-sub">Pick a theme. The OS re-skins instantly.</p>
      <div className="scene-grid">
        {THEMES.map((th) => (
          <button
            key={th.id}
            className={"scene-card" + (scene === th.id ? " is-active" : "")}
            onClick={() => setScene(th.id)}
          >
            <span
              className="scene-swatch"
              aria-hidden="true"
              style={{
                background: th.swatch.bg,
                position: "relative",
                width: 96,
                height: 56,
                display: "block",
                border: "1px solid #000",
              }}
            >
              <span
                className="swatch-bar"
                style={{ position: "absolute", left: 4, top: 4, width: 72, height: 12, background: th.swatch.title, display: "block" }}
              />
              <span
                className="swatch-win"
                style={{ position: "absolute", left: 4, top: 20, width: 72, height: 28, background: th.swatch.window, display: "block" }}
              />
            </span>
            <span className="scene-name">{th.name}</span>
            <span className="scene-blurb">{th.blurb}</span>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: "26px" }}>Desktop</h2>
      <label className="settings-row">
        <span>
          <span className="settings-row-title">Align icons to a grid</span>
          <span className="settings-row-desc">Keep desktop icons locked to a tidy grid formation.</span>
        </span>
        <button
          className={"toggle" + (gridSnap ? " is-on" : "")}
          role="switch"
          aria-checked={gridSnap}
          onClick={() => setGridSnap(!gridSnap)}
        >
          <span className="toggle-knob" />
        </button>
      </label>

      <h2 style={{ marginTop: "26px" }}>About BK-OS</h2>
      <p className="settings-sub" style={{ marginBottom: 6 }}>
        Built by Bailey King in Brisbane. Self-hosted on a mini PC under my desk.
      </p>
      <p className="settings-sub">
        Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to jump to anything fast.
      </p>
    </div>
  );
}
