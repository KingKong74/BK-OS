"use client";

import { useOS } from "@/os/store";
import type { ThemeId, DockStyleId } from "@/os/types";

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

// Taskbar styles mirror the theme cards but only re-skin the dock.
const DOCKS: { id: DockStyleId; name: string; blurb: string; bar: string; bevelLight: string; bevelDark: string; start: string; startFg: string; glow?: string }[] = [
  {
    id: "win98",
    name: "Silver",
    blurb: "The classic grey taskbar with raised bevels.",
    bar: "#c0c0c0", bevelLight: "#ffffff", bevelDark: "#808080", start: "#c0c0c0", startFg: "#000",
  },
  {
    id: "win98-dark",
    name: "Win98 at Night",
    blurb: "A dark taskbar — pairs with either OS theme.",
    bar: "#2a2a32", bevelLight: "#4a4a52", bevelDark: "#1a1a22", start: "#2a2a32", startFg: "#e8e8ea",
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Near-black with an electric-blue glow. The slick one.",
    bar: "#0a0a14", bevelLight: "#3d5a9a", bevelDark: "#050510", start: "#16213e", startFg: "#6db3ff", glow: "#4d9fff",
  },
];

// Period-appropriate desktop colours.
const WALLPAPERS: { id: string; name: string; color: string }[] = [
  { id: "teal", name: "Teal", color: "#008080" },
  { id: "navy", name: "Navy", color: "#1a3a6a" },
  { id: "maroon", name: "Maroon", color: "#7a1f2b" },
  { id: "olive", name: "Olive", color: "#5a5a2a" },
  { id: "purple", name: "Purple", color: "#4a2a6a" },
  { id: "charcoal", name: "Charcoal", color: "#2b2b30" },
];

export function SettingsApp() {
  const scene = useOS((s) => s.scene);
  const setScene = useOS((s) => s.setScene);
  const dockStyle = useOS((s) => s.dockStyle);
  const setDockStyle = useOS((s) => s.setDockStyle);
  const wallpaperColor = useOS((s) => s.wallpaperColor);
  const setWallpaperColor = useOS((s) => s.setWallpaperColor);
  const gridSnap = useOS((s) => s.gridSnap);
  const setGridSnap = useOS((s) => s.setGridSnap);
  const soundEffects = useOS((s) => s.soundEffects);
  const setSoundEffects = useOS((s) => s.setSoundEffects);

  const hostname = typeof window !== "undefined" ? window.location.hostname : "bkos";

  return (
    <div className="settings-app">
      <h2>Theme</h2>
      <p className="settings-sub">Pick a theme. The OS re-skins instantly.</p>
      <div className="scene-grid">
        {THEMES.map((th) => (
          <button
            key={th.id}
            className={"scene-card" + (scene === th.id ? " is-active" : "")}
            onClick={() => setScene(th.id)}
          >
            <span className="scene-swatch" aria-hidden="true" style={{ background: th.swatch.bg, height: 56 }}>
              <span className="swatch-bar" style={{ left: 4, top: 4, width: 72, height: 12, background: th.swatch.title, position: "absolute", display: "block" }} />
              <span className="swatch-win" style={{ left: 4, top: 20, width: 72, height: 28, background: th.swatch.window, position: "absolute", display: "block" }} />
            </span>
            <span className="scene-name">{th.name}</span>
            <span className="scene-blurb">{th.blurb}</span>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 26 }}>Taskbar style</h2>
      <p className="settings-sub">Skin the taskbar separately from the OS theme.</p>
      <div className="scene-grid">
        {DOCKS.map((dk) => (
          <button
            key={dk.id}
            className={"scene-card" + (dockStyle === dk.id ? " is-active" : "")}
            onClick={() => setDockStyle(dk.id)}
          >
            <span className="scene-swatch" aria-hidden="true" style={{ background: scene === "win98-dark" ? "#1a1a2e" : "#008080", height: 56, padding: 0 }}>
              <span
                style={{
                  position: "absolute", left: 0, right: 0, bottom: 0, height: 18,
                  background: dk.bar,
                  boxShadow: `inset 0 1px ${dk.bevelLight}, inset 0 -1px ${dk.bevelDark}`,
                  display: "flex", alignItems: "center", gap: 3, padding: "0 3px",
                }}
              >
                <span style={{ width: 16, height: 12, background: dk.start, color: dk.startFg, boxShadow: dk.glow ? `inset 0 0 0 1px ${dk.glow}, 0 0 5px ${dk.glow}` : `inset -1px -1px ${dk.bevelDark}, inset 1px 1px ${dk.bevelLight}` }} />
                <span style={{ width: 10, height: 12, background: dk.bar, boxShadow: dk.glow ? `inset 0 0 0 1px ${dk.bevelLight}` : `inset -1px -1px ${dk.bevelDark}, inset 1px 1px ${dk.bevelLight}` }} />
                <span style={{ width: 10, height: 12, background: dk.bar, boxShadow: dk.glow ? `inset 0 0 0 1px ${dk.bevelLight}` : `inset -1px -1px ${dk.bevelDark}, inset 1px 1px ${dk.bevelLight}` }} />
              </span>
            </span>
            <span className="scene-name">{dk.name}</span>
            <span className="scene-blurb">{dk.blurb}</span>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 26 }}>Wallpaper colour</h2>
      <p className="settings-sub">A flat desktop colour, the way the old OSes did it.</p>
      <div className="wp-grid">
        {WALLPAPERS.map((wp) => (
          <button
            key={wp.id}
            className={"wp-swatch" + (wallpaperColor === wp.color ? " is-active" : "")}
            title={wp.name}
            onClick={() => setWallpaperColor(wp.color)}
          >
            <span className="wp-chip" style={{ background: wp.color }} />
            <span className="wp-name">{wp.name}</span>
          </button>
        ))}
      </div>
      {wallpaperColor && (
        <button className="settings-link" onClick={() => setWallpaperColor(null)}>
          Reset to theme default
        </button>
      )}

      <h2 style={{ marginTop: 26 }}>Desktop</h2>
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

      <h2 style={{ marginTop: 26 }}>Pointer &amp; sound</h2>
      <label className="settings-row">
        <span>
          <span className="settings-row-title">Cursor style <span className="settings-badge">Coming soon</span></span>
          <span className="settings-row-desc">Currently using the OS default pointer.</span>
        </span>
        <select className="settings-select" value="default" disabled>
          <option value="default">Default</option>
        </select>
      </label>
      <label className="settings-row">
        <span>
          <span className="settings-row-title">Sound effects <span className="settings-badge">Coming soon</span></span>
          <span className="settings-row-desc">Classic chimes and clicks. Saved for when they&rsquo;re wired up.</span>
        </span>
        <button
          className={"toggle" + (soundEffects ? " is-on" : "")}
          role="switch"
          aria-checked={soundEffects}
          onClick={() => setSoundEffects(!soundEffects)}
        >
          <span className="toggle-knob" />
        </button>
      </label>

      <h2 style={{ marginTop: 26 }}>About BK-OS</h2>
      <p className="settings-sub" style={{ marginBottom: 6 }}>
        Built by Bailey King in Brisbane. Self-hosted on a mini PC under my desk.
      </p>
      <dl className="settings-about">
        <div><dt>Version</dt><dd>BK-OS 0.1</dd></div>
        <div><dt>Hostname</dt><dd>{hostname}</dd></div>
        <div><dt>Shell</dt><dd>Next.js · Win98 aesthetic</dd></div>
      </dl>
      <p className="settings-sub" style={{ marginTop: 12 }}>
        Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to jump to anything fast.
      </p>
    </div>
  );
}
