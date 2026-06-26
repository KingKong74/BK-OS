"use client";

import { useRef, useState } from "react";
import { useOS } from "@/os/store";
import { Icon } from "@/components/Icon";
import { Avatar, PRESET_AVATARS, PRESET_IDS } from "@/components/Avatar";
import type { ThemeId, DockStyleId, LauncherStyle, IconName } from "@/os/types";

const THEMES: { id: ThemeId; name: string; blurb: string; swatch: { bg: string; window: string; title: string } }[] = [
  { id: "win98", name: "Retro 98", blurb: "Bright teal desktop, silver chrome.", swatch: { bg: "#008080", window: "#c0c0c0", title: "#000080" } },
  { id: "win98-dark", name: "Win98 at Night", blurb: "Same shapes, lights off.", swatch: { bg: "#1a1a2e", window: "#2a2a32", title: "#1a3a6a" } },
];

const DOCKS: { id: DockStyleId; name: string; blurb: string; bar: string; light: string; dark: string; start: string; startFg: string; glow?: string; centered?: boolean }[] = [
  { id: "win98", name: "Silver", blurb: "Classic grey taskbar, icons left.", bar: "#c0c0c0", light: "#ffffff", dark: "#808080", start: "#c0c0c0", startFg: "#000" },
  { id: "win98-dark", name: "Win98 at Night", blurb: "Dark bevels, icons left.", bar: "#2a2a32", light: "#4a4a52", dark: "#1a1a22", start: "#2a2a32", startFg: "#e8e8ea" },
  { id: "midnight", name: "Midnight", blurb: "Near-black with a blue glow.", bar: "#0a0a14", light: "#3d5a9a", dark: "#050510", start: "#16213e", startFg: "#6db3ff", glow: "#4d9fff" },
  { id: "windows-11", name: "Windows 11", blurb: "Floating rounded dock, icons centered.", bar: "#14161f", light: "#2a3550", dark: "#08080e", start: "#1c2950", startFg: "#7fc0ff", glow: "#4d9fff", centered: true },
];

const LAUNCHERS: { id: LauncherStyle; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic", blurb: "Win98 start menu, bottom-left column." },
  { id: "modern", name: "Modern", blurb: "Win11-style centered frosted panel." },
];

const WALLPAPERS: { id: string; name: string; color: string }[] = [
  { id: "teal", name: "Teal", color: "#008080" },
  { id: "navy", name: "Navy", color: "#1a3a6a" },
  { id: "maroon", name: "Maroon", color: "#7a1f2b" },
  { id: "olive", name: "Olive", color: "#5a5a2a" },
  { id: "purple", name: "Purple", color: "#4a2a6a" },
  { id: "charcoal", name: "Charcoal", color: "#2b2b30" },
];

type Cat = "appearance" | "profile" | "taskbar" | "desktop" | "apps" | "sound" | "about";
const CATEGORIES: { id: Cat; label: string; icon: IconName }[] = [
  { id: "appearance", label: "Appearance", icon: "sun" },
  { id: "profile", label: "Profile", icon: "photo" },
  { id: "taskbar", label: "Taskbar", icon: "list" },
  { id: "desktop", label: "Desktop", icon: "grid" },
  { id: "apps", label: "Apps", icon: "folder" },
  { id: "sound", label: "Sound & Cursor", icon: "music" },
  { id: "about", label: "About BK-OS", icon: "shield" },
];

function Check() {
  return <span className="card-check" aria-hidden="true">✓</span>;
}

export function SettingsApp() {
  const [cat, setCat] = useState<Cat>("appearance");
  const scene = useOS((s) => s.scene);
  const setScene = useOS((s) => s.setScene);
  const dockStyle = useOS((s) => s.dockStyle);
  const setDockStyle = useOS((s) => s.setDockStyle);
  const dockMatchesTheme = useOS((s) => s.dockMatchesTheme);
  const setDockMatchesTheme = useOS((s) => s.setDockMatchesTheme);
  const launcherStyle = useOS((s) => s.launcherStyle);
  const setLauncherStyle = useOS((s) => s.setLauncherStyle);
  const wallpaperColor = useOS((s) => s.wallpaperColor);
  const setWallpaperColor = useOS((s) => s.setWallpaperColor);
  const gridSnap = useOS((s) => s.gridSnap);
  const setGridSnap = useOS((s) => s.setGridSnap);
  const soundEffects = useOS((s) => s.soundEffects);
  const setSoundEffects = useOS((s) => s.setSoundEffects);
  const externalAppMode = useOS((s) => s.externalAppMode);
  const setExternalAppMode = useOS((s) => s.setExternalAppMode);
  const resetIconPositions = useOS((s) => s.resetIconPositions);
  const profileAvatar = useOS((s) => s.profileAvatar);
  const setProfileAvatar = useOS((s) => s.setProfileAvatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const hostname = typeof window !== "undefined" ? window.location.hostname : "bkos";

  // Read an uploaded image, downscale it to 128×128, and store it as a data
  // URL. Downscaling keeps the persisted store small (it lives in localStorage).
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const N = 128;
        const canvas = document.createElement("canvas");
        canvas.width = N;
        canvas.height = N;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // cover-crop to a square
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, N, N);
        setProfileAvatar({ type: "custom", value: canvas.toDataURL("image/png") });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="settings2">
      <nav className="settings2-rail">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={"settings2-navitem" + (cat === c.id ? " is-active" : "")}
            onClick={() => setCat(c.id)}
          >
            <Icon name={c.icon} size={15} />
            <span>{c.label}</span>
          </button>
        ))}
      </nav>

      <div className="settings2-pane">
        {cat === "appearance" && (
          <>
            <h2 className="settings2-h">Theme</h2>
            <p className="settings2-sub">Pick a theme. The OS re-skins instantly.</p>
            <div className="card-grid">
              {THEMES.map((th) => (
                <button key={th.id} className={"select-card" + (scene === th.id ? " is-active" : "")} onClick={() => setScene(th.id)}>
                  {scene === th.id && <Check />}
                  <span className="card-swatch" style={{ background: th.swatch.bg }}>
                    <span style={{ position: "absolute", left: 6, top: 6, width: 70, height: 12, background: th.swatch.title }} />
                    <span style={{ position: "absolute", left: 6, top: 22, width: 70, height: 26, background: th.swatch.window }} />
                  </span>
                  <span className="card-name">{th.name}</span>
                  <span className="card-blurb">{th.blurb}</span>
                </button>
              ))}
            </div>

            <h2 className="settings2-h">Wallpaper colour</h2>
            <p className="settings2-sub">A flat desktop colour, the way the old OSes did it.</p>
            <div className="wp-grid">
              {WALLPAPERS.map((wp) => (
                <button key={wp.id} className={"wp-swatch" + (wallpaperColor === wp.color ? " is-active" : "")} title={wp.name} onClick={() => setWallpaperColor(wp.color)}>
                  <span className="wp-chip" style={{ background: wp.color }}>{wallpaperColor === wp.color && <Check />}</span>
                  <span className="wp-name">{wp.name}</span>
                </button>
              ))}
            </div>
            {wallpaperColor && <button className="settings2-link" onClick={() => setWallpaperColor(null)}>Reset to theme default</button>}
          </>
        )}

        {cat === "profile" && (
          <>
            <h2 className="settings2-h">Profile picture</h2>
            <p className="settings2-sub">Shown on the Start menu and anywhere your face surfaces.</p>

            <div className="avatar-preview-row">
              <Avatar size={56} />
              <div className="avatar-preview-meta">
                <span className="avatar-preview-name">Bailey</span>
                <span className="avatar-preview-kind">
                  {profileAvatar.type === "custom" ? "Custom image"
                    : profileAvatar.type === "preset" ? "Preset avatar"
                    : "Initials"}
                </span>
              </div>
            </div>

            <h2 className="settings2-h">Presets</h2>
            <div className="avatar-grid">
              {PRESET_IDS.map((id) => {
                const active = profileAvatar.type === "preset" && profileAvatar.value === id;
                return (
                  <button
                    key={id}
                    className={"avatar-opt" + (active ? " is-active" : "")}
                    title={id}
                    onClick={() => setProfileAvatar({ type: "preset", value: id })}
                  >
                    <svg viewBox="0 0 32 32" width={44} height={44} className="avatar avatar-svg" aria-hidden="true">
                      {PRESET_AVATARS[id]}
                    </svg>
                    {active && <Check />}
                  </button>
                );
              })}
            </div>

            <h2 className="settings2-h">Initials</h2>
            <p className="settings2-sub">Up to two characters on a coloured chip.</p>
            <div className="avatar-initials-row">
              <input
                className="settings-input"
                type="text"
                maxLength={2}
                placeholder="BK"
                value={profileAvatar.type === "initials" ? profileAvatar.value : ""}
                onChange={(e) => setProfileAvatar({ type: "initials", value: e.target.value.toUpperCase() })}
                onFocus={() => { if (profileAvatar.type !== "initials") setProfileAvatar({ type: "initials", value: profileAvatar.value.slice(0, 2) }); }}
              />
              <span className="avatar-initials-hint">Letters or numbers</span>
            </div>

            <h2 className="settings2-h">Custom image</h2>
            <p className="settings2-sub">Upload a photo — it&rsquo;s cropped to a square and scaled down to keep things snappy.</p>
            <div className="avatar-custom-row">
              <button className="settings2-btn" onClick={() => fileRef.current?.click()}>Upload image…</button>
              {profileAvatar.type === "custom" && (
                <button className="settings2-link" onClick={() => setProfileAvatar({ type: "initials", value: "BK" })}>Remove</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            </div>
          </>
        )}

        {cat === "taskbar" && (
          <>
            <h2 className="settings2-h">Taskbar style</h2>
            <p className="settings2-sub">Skin the taskbar — independently of the OS theme.</p>
            <div className="card-grid">
              {DOCKS.map((dk) => (
                <button key={dk.id} className={"select-card" + (dockStyle === dk.id ? " is-active" : "")} onClick={() => setDockStyle(dk.id)}>
                  {dockStyle === dk.id && <Check />}
                  <span className="card-swatch" style={{ background: scene === "win98-dark" ? "#1a1a2e" : "#008080" }}>
                    <DockPreview dk={dk} />
                  </span>
                  <span className="card-name">{dk.name}</span>
                  <span className="card-blurb">{dk.blurb}</span>
                </button>
              ))}
            </div>

            <label className="settings2-row">
              <span>
                <span className="settings2-row-title">Match taskbar to theme</span>
                <span className="settings2-row-desc">Switching theme also switches the taskbar to its matching style.</span>
              </span>
              <button className={"toggle" + (dockMatchesTheme ? " is-on" : "")} role="switch" aria-checked={dockMatchesTheme} onClick={() => setDockMatchesTheme(!dockMatchesTheme)}>
                <span className="toggle-knob" />
              </button>
            </label>

            <h2 className="settings2-h">Start menu style</h2>
            <p className="settings2-sub">Classic bottom-left menu, or a modern centered panel.</p>
            <div className="card-grid">
              {LAUNCHERS.map((lc) => (
                <button key={lc.id} className={"select-card" + (launcherStyle === lc.id ? " is-active" : "")} onClick={() => setLauncherStyle(lc.id)}>
                  {launcherStyle === lc.id && <Check />}
                  <span className="card-swatch" style={{ background: "#11131c" }}>
                    <LauncherPreview id={lc.id} />
                  </span>
                  <span className="card-name">{lc.name}</span>
                  <span className="card-blurb">{lc.blurb}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {cat === "desktop" && (
          <>
            <h2 className="settings2-h">Desktop</h2>
            <label className="settings2-row">
              <span>
                <span className="settings2-row-title">Align icons to a grid</span>
                <span className="settings2-row-desc">Keep desktop icons locked to a tidy grid formation.</span>
              </span>
              <button className={"toggle" + (gridSnap ? " is-on" : "")} role="switch" aria-checked={gridSnap} onClick={() => setGridSnap(!gridSnap)}>
                <span className="toggle-knob" />
              </button>
            </label>
            <label className="settings2-row">
              <span>
                <span className="settings2-row-title">Icon flow</span>
                <span className="settings2-row-desc">Tidied icons now flow left-to-right in rows (macOS-style), wrapping at the edge.</span>
              </span>
              <button className="settings2-btn" onClick={() => resetIconPositions()}>Tidy icons now</button>
            </label>
          </>
        )}

        {cat === "apps" && (
          <>
            <h2 className="settings2-h">Apps</h2>
            <label className="settings2-row">
              <span>
                <span className="settings2-row-title">Open external apps in a new tab</span>
                <span className="settings2-row-desc">External apps (Moniqr, Claude, social links) open in a browser tab. Turn off to open them inside a BK-OS window.</span>
              </span>
              <button
                className={"toggle" + (externalAppMode === "new-tab" ? " is-on" : "")}
                role="switch"
                aria-checked={externalAppMode === "new-tab"}
                onClick={() => setExternalAppMode(externalAppMode === "new-tab" ? "in-window" : "new-tab")}
              >
                <span className="toggle-knob" />
              </button>
            </label>
            <h2 className="settings2-h">Pinned shortcuts</h2>
            <div className="settings2-empty">
              <Icon name="folder" size={26} />
              <p className="settings2-empty-title">Pinned shortcut management</p>
              <p className="settings2-empty-sub">Coming soon. For now, right-click an app in the Start menu or drag it to the desktop or taskbar.</p>
            </div>
          </>
        )}

        {cat === "sound" && (
          <>
            <h2 className="settings2-h">Pointer &amp; sound</h2>
            <label className="settings2-row">
              <span>
                <span className="settings2-row-title">Cursor style <span className="settings-badge">Coming soon</span></span>
                <span className="settings2-row-desc">Currently using the OS default pointer.</span>
              </span>
              <select className="settings-select" value="default" disabled>
                <option value="default">Default</option>
              </select>
            </label>
            <label className="settings2-row">
              <span>
                <span className="settings2-row-title">Sound effects <span className="settings-badge">Coming soon</span></span>
                <span className="settings2-row-desc">Classic chimes and clicks. Saved for when they&rsquo;re wired up.</span>
              </span>
              <button className={"toggle" + (soundEffects ? " is-on" : "")} role="switch" aria-checked={soundEffects} onClick={() => setSoundEffects(!soundEffects)}>
                <span className="toggle-knob" />
              </button>
            </label>
          </>
        )}

        {cat === "about" && (
          <>
            <h2 className="settings2-h">About BK-OS</h2>
            <p className="settings2-sub" style={{ marginBottom: 10 }}>Built by Bailey King in Brisbane. Self-hosted on a mini PC under my desk.</p>
            <dl className="settings-about">
              <div><dt>Version</dt><dd>BK-OS 0.1</dd></div>
              <div><dt>Hostname</dt><dd>{hostname}</dd></div>
              <div><dt>Shell</dt><dd>Next.js · Win98 aesthetic</dd></div>
            </dl>
            <p className="settings2-sub" style={{ marginTop: 14 }}>Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to jump to anything fast.</p>
          </>
        )}
      </div>
    </div>
  );
}

function DockPreview({ dk }: { dk: typeof DOCKS[number] }) {
  const chip = (extra?: React.CSSProperties) => (
    <span style={{ width: 11, height: 13, background: dk.glow ? "#1a2340" : dk.bar, boxShadow: dk.glow ? "inset 0 0 0 1px " + dk.light : `inset -1px -1px ${dk.dark}, inset 1px 1px ${dk.light}`, ...extra }} />
  );
  const start = (
    <span style={{ width: 17, height: 13, background: dk.start, color: dk.startFg, boxShadow: dk.glow ? `inset 0 0 0 1px ${dk.glow}, 0 0 5px ${dk.glow}` : `inset -1px -1px ${dk.dark}, inset 1px 1px ${dk.light}` }} />
  );
  if (dk.centered) {
    // Floating, rounded, centered pill + a separate floating tray pill.
    const pill: React.CSSProperties = { position: "absolute", bottom: 5, display: "flex", alignItems: "center", gap: 3, padding: "3px 5px", borderRadius: 7, background: "rgba(22,24,34,0.92)", boxShadow: "0 2px 7px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.10)" };
    return (
      <>
        <span style={{ ...pill, left: "50%", transform: "translateX(-50%)" }}>
          {start}{chip()}{chip()}{chip()}
        </span>
        <span style={{ ...pill, right: 5, width: 12, height: 13 }} />
      </>
    );
  }
  return (
    <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, background: dk.bar, boxShadow: `inset 0 1px ${dk.light}`, display: "flex", alignItems: "center", gap: 3, padding: "0 4px" }}>
      {start}{chip()}{chip()}
      <span style={{ marginLeft: "auto", width: 8, height: 13, background: dk.glow ? "#0c0c16" : dk.bar, boxShadow: dk.glow ? "none" : `inset 1px 1px ${dk.dark}` }} />
    </span>
  );
}

function LauncherPreview({ id }: { id: LauncherStyle }) {
  if (id === "classic") {
    return <span style={{ position: "absolute", left: 5, bottom: 4, width: 34, height: 40, background: "#c0c0c0", boxShadow: "inset 1px 1px #fff, inset -1px -1px #404040" }} />;
  }
  return (
    <span style={{ position: "absolute", left: "50%", bottom: 8, transform: "translateX(-50%)", width: 58, height: 38, borderRadius: 6, background: "rgba(40,44,66,0.92)", boxShadow: "0 0 0 1px rgba(120,150,220,0.4), 0 4px 10px rgba(0,0,0,0.4)", display: "flex", flexWrap: "wrap", gap: 3, padding: 5, alignContent: "flex-start" }}>
      {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 2, background: "#4d9fff66" }} />)}
    </span>
  );
}
