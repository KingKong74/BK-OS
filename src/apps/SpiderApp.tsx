"use client";

import { AppIcon } from "@/components/AppIcon";
import { useOS } from "@/os/store";

export function SpiderApp() {
  const openApp = useOS((s) => s.openApp);
  return (
    <div className="game-placeholder">
      <div className="game-placeholder-icon">
        <AppIcon id="spider" size={64} />
      </div>
      <h2>Spider Solitaire</h2>
      <p>Two decks, ten columns, build down by suit — but the engine isn&rsquo;t wired yet.</p>
      <p className="game-placeholder-hint">
        FreeCell is ready if you&rsquo;re looking for a quick round.
      </p>
      <button onClick={() => openApp("freecell")}>Open FreeCell instead</button>
    </div>
  );
}
