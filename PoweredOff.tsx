"use client";

import { useOS } from "@/os/store";
import type { SceneId } from "@/os/types";

const SCENES: { id: SceneId; name: string; blurb: string }[] = [
  { id: "modern", name: "Modern", blurb: "Clean, flat, rounded — the default look." },
  { id: "win98", name: "Retro 98", blurb: "Beveled grey chrome and a teal desktop." },
];

export function SettingsApp() {
  const scene = useOS((s) => s.scene);
  const setScene = useOS((s) => s.setScene);
  const gridSnap = useOS((s) => s.gridSnap);
  const setGridSnap = useOS((s) => s.setGridSnap);

  return (
    <div className="settings-app">
      <h2>Appearance</h2>
      <p className="settings-sub">Pick a scene. The whole OS re-skins instantly.</p>
      <div className="scene-grid">
        {SCENES.map((sc) => (
          <button
            key={sc.id}
            className={"scene-card" + (scene === sc.id ? " is-active" : "")}
            onClick={() => setScene(sc.id)}
          >
            <span className={"scene-swatch swatch-" + sc.id} aria-hidden="true">
              <span className="swatch-bar" />
              <span className="swatch-win" />
            </span>
            <span className="scene-name">{sc.name}</span>
            <span className="scene-blurb">{sc.blurb}</span>
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

      <p className="settings-hint">
        Add more scenes in <code>src/scenes/scenes.css</code> and the list in{" "}
        <code>SettingsApp.tsx</code>.
      </p>
    </div>
  );
}
