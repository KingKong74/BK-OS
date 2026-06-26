"use client";

import { useState, type ReactNode, type MutableRefObject } from "react";
import { useOS } from "@/os/store";
import { visibleApps } from "@/os/appsMeta";
import { APP_MAP } from "@/os/appsMeta";
import type { AppCategory, IconName } from "@/os/types";
import { getClientMode } from "@/lib/mode";
import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";

/**
 * The authentic Win98 classic Start menu: a vertical branding sidebar, chunky
 * menu rows with fly-out submenus (Programs / Favorites / Documents / Settings
 * / Find), a Run dialog, and Log Off / Shut Down. Selected as "Classic" under
 * Settings → Start menu style; the modern panel remains the alternative.
 */

const CATEGORY_ORDER: AppCategory[] = [
  "system", "productivity", "development", "infrastructure", "media", "finance", "social", "games",
];
const CATEGORY_LABELS: Record<AppCategory, string> = {
  system: "System", productivity: "Productivity", development: "Development",
  infrastructure: "Infrastructure", media: "Media", finance: "Finance",
  social: "Social", games: "Games",
};

export function ClassicStartMenu({
  panelRef,
  onClose,
}: {
  panelRef: MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const openApp = useOS((s) => s.openApp);
  const lock = useOS((s) => s.lock);
  const shutdown = useOS((s) => s.shutdown);
  const setVaultInitialPath = useOS((s) => s.setVaultInitialPath);
  const setCommandPaletteOpen = useOS((s) => s.setCommandPaletteOpen);

  const [open, setOpen] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);

  const mode = getClientMode();
  const visible = visibleApps(mode);

  const launch = (id: string) => { openApp(id); onClose(); };
  const openAt = (path: string[]) => { setVaultInitialPath(path); openApp("mycomputer"); onClose(); };

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, apps: visible.filter((a) => a.category === cat && a.showInLauncher !== false) }))
    .filter((g) => g.apps.length > 0);
  const favorites = visible.filter((a) => a.url);

  // ── Submenu bodies ──
  const programsMenu = (
    <div className="cmenu-flyout">
      {grouped.map((g) => (
        <div key={g.cat}>
          <div className="cmenu-subhead">{CATEGORY_LABELS[g.cat]}</div>
          {g.apps.map((a) => (
            <button key={a.id} className="cmenu-subrow" onClick={() => launch(a.id)}>
              <span className="cmenu-subicon"><AppIcon id={a.id} size={18} /></span>
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  const favoritesMenu = (
    <div className="cmenu-flyout">
      {favorites.length === 0 && <div className="cmenu-empty">(Empty)</div>}
      {favorites.map((a) => (
        <button key={a.id} className="cmenu-subrow" onClick={() => launch(a.id)}>
          <span className="cmenu-subicon"><AppIcon id={a.id} size={18} /></span>
          <span>{a.name}</span>
        </button>
      ))}
    </div>
  );

  const documentsMenu = (
    <div className="cmenu-flyout">
      <button className="cmenu-subrow" onClick={() => openAt(["C:", "Users", "Bailey", "Documents"])}>
        <span className="cmenu-subicon"><Icon name="folder" size={16} /></span><span>My Documents</span>
      </button>
      <button className="cmenu-subrow" onClick={() => openAt(["C:", "Users", "Bailey", "Pictures"])}>
        <span className="cmenu-subicon"><Icon name="photo" size={16} /></span><span>My Pictures</span>
      </button>
      <button className="cmenu-subrow" onClick={() => openAt(["C:", "Users", "Bailey", "Desktop"])}>
        <span className="cmenu-subicon"><Icon name="grid" size={16} /></span><span>Desktop</span>
      </button>
    </div>
  );

  const settingsMenu = (
    <div className="cmenu-flyout">
      <button className="cmenu-subrow" onClick={() => launch("settings")}>
        <span className="cmenu-subicon"><Icon name="settings" size={16} /></span><span>Control Panel</span>
      </button>
      <button className="cmenu-subrow" onClick={() => launch("settings")}>
        <span className="cmenu-subicon"><Icon name="list" size={16} /></span><span>Taskbar &amp; Start Menu...</span>
      </button>
      <button className="cmenu-subrow" onClick={() => launch("settings")}>
        <span className="cmenu-subicon"><Icon name="sun" size={16} /></span><span>Active Desktop</span>
      </button>
    </div>
  );

  const findMenu = (
    <div className="cmenu-flyout">
      <button className="cmenu-subrow" onClick={() => { setCommandPaletteOpen(true); onClose(); }}>
        <span className="cmenu-subicon"><Icon name="search" size={16} /></span><span>Files or Folders...</span>
      </button>
      <button className="cmenu-subrow" onClick={() => launch("mycomputer")}>
        <span className="cmenu-subicon"><Icon name="server" size={16} /></span><span>Computer...</span>
      </button>
      <button className="cmenu-subrow" onClick={() => launch("explorer")}>
        <span className="cmenu-subicon"><Icon name="globe" size={16} /></span><span>On the Internet...</span>
      </button>
    </div>
  );

  // ── Top-level rows ──
  type Row =
    | { sep: true }
    | { id: string; label: ReactNode; icon: IconName; flyout?: ReactNode; onClick?: () => void };
  const rows: Row[] = [
    { id: "programs", label: "Programs", icon: "grid", flyout: programsMenu },
    { id: "favorites", label: "Favorites", icon: "globe", flyout: favoritesMenu },
    { id: "documents", label: "Documents", icon: "folder", flyout: documentsMenu },
    { id: "settings", label: "Settings", icon: "settings", flyout: settingsMenu },
    { id: "find", label: "Find", icon: "search", flyout: findMenu },
    { id: "help", label: "Help", icon: "shield", onClick: () => launch("help") },
    { id: "run", label: "Run...", icon: "command", onClick: () => setRunOpen(true) },
    { sep: true },
    { id: "logoff", label: <>Log Off <b>{"Bailey"}</b>...</>, icon: "lock", onClick: () => { onClose(); lock(); } },
    { id: "shutdown", label: "Shut Down...", icon: "power", onClick: () => { onClose(); shutdown(); } },
  ];

  return (
    <div
      ref={panelRef}
      className="cmenu"
      data-launcher="classic"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cmenu-sidebar" aria-hidden="true">
        <span className="cmenu-brand"><span className="cmenu-brand-light">Bailey</span><b>OS</b></span>
      </div>
      <div className="cmenu-items">
        {rows.map((row, i) =>
          "sep" in row ? (
            <div key={`sep${i}`} className="cmenu-sep" />
          ) : (
            <div
              key={row.id}
              className="cmenu-rowwrap"
              onMouseEnter={() => setOpen(row.flyout ? row.id : null)}
            >
              <button
                className={"cmenu-row" + (open === row.id ? " is-open" : "")}
                onClick={() => { if (row.onClick) row.onClick(); }}
              >
                <span className="cmenu-icon"><Icon name={row.icon} size={22} /></span>
                <span className="cmenu-label">{row.label}</span>
                {row.flyout && <span className="cmenu-arrow">▶</span>}
              </button>
              {row.flyout && open === row.id && row.flyout}
            </div>
          )
        )}
      </div>

      {runOpen && <RunDialog onClose={() => setRunOpen(false)} onRun={launch} />}
    </div>
  );
}

function RunDialog({ onClose, onRun }: { onClose: () => void; onRun: (id: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const resolve = (raw: string): string | null => {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    if (APP_MAP[q]) return q;
    const byName = Object.values(APP_MAP).find((a) => a.name.toLowerCase() === q);
    return byName ? byName.id : null;
  };
  const run = () => {
    const id = resolve(value);
    if (id) onRun(id);
    else setError(true);
  };

  return (
    <div className="cmenu-run" onClick={(e) => e.stopPropagation()}>
      <div className="cmenu-run-title">
        <span>Run</span>
        <button className="cmenu-run-x" onClick={onClose}>✕</button>
      </div>
      <div className="cmenu-run-body">
        <p className="cmenu-run-hint">Type the name of a program and BK-OS will open it for you.</p>
        <label className="cmenu-run-field">
          <span>Open:</span>
          <input
            autoFocus
            value={value}
            placeholder="notepad"
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") run(); if (e.key === "Escape") onClose(); }}
          />
        </label>
        {error && <p className="cmenu-run-error">Cannot find &lsquo;{value}&rsquo;. Check the name and try again.</p>}
        <div className="cmenu-run-actions">
          <button onClick={run}>OK</button>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onRun("mycomputer")}>Browse...</button>
        </div>
      </div>
    </div>
  );
}
