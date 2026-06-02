"use client";

import { AppIcon } from "@/components/AppIcon";
import { useOS } from "@/os/store";

export function HeartsApp() {
  const openApp = useOS((s) => s.openApp);
  return (
    <div className="game-placeholder">
      <div className="game-placeholder-icon"><AppIcon id="hearts" size={64} /></div>
      <h2>Hearts</h2>
      <p>Pass three cards, dodge the queen of spades, shoot the moon — engine not wired yet.</p>
      <p className="game-placeholder-hint">FreeCell is the working game for now.</p>
      <button onClick={() => openApp("freecell")}>Open FreeCell instead</button>
    </div>
  );
}
