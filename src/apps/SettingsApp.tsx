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
      <p className="settings-hint">
        Add more scenes in <code>src/scenes/scenes.css</code> and the list in{" "}
        <code>SettingsApp.tsx</code>.
      </p>
    </div>
  );
}
