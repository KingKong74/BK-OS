"use client";

import { AppIcon } from "@/components/AppIcon";
import { useOS } from "@/os/store";

export function MinesweeperApp() {
  const openApp = useOS((s) => s.openApp);
  return (
    <div className="game-placeholder">
      <div className="game-placeholder-icon"><AppIcon id="mine" size={64} /></div>
      <h2>Minesweeper</h2>
      <p>Click safely, flag the bombs, time your runs — engine not wired yet.</p>
      <p className="game-placeholder-hint">FreeCell is the working game for now.</p>
      <button onClick={() => openApp("freecell")}>Open FreeCell instead</button>
    </div>
  );
}
