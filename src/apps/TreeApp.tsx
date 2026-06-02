"use client";

import { AppIcon } from "@/components/AppIcon";

export function TreeApp() {
  return (
    <div className="game-placeholder">
      <div className="game-placeholder-icon"><AppIcon id="tree" size={64} /></div>
      <h2>Tree</h2>
      <p>A garden game lives here, eventually. Plant, prune, watch it grow — the rules aren&rsquo;t written yet.</p>
      <p className="game-placeholder-hint">For now it&rsquo;s just the icon. Idea bin&rsquo;s open.</p>
    </div>
  );
}
