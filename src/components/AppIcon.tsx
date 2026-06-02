"use client";

import type { ReactNode } from "react";
import { APP_ICONS } from "@/os/appIcons";
import { APP_ICON_IMG } from "@/os/appAssets";
import { APP_MAP } from "@/os/appsMeta";
import { useOS } from "@/os/store";
import { Icon } from "./Icon";

/**
 * Render a per-app icon. Order of preference:
 *  1. Real PNG asset from APP_ICON_IMG (the classic ICO set).
 *  2. Hand-drawn retro SVG from APP_ICONS (kept for apps without an asset).
 *  3. Fallback stroke icon from Icon.tsx based on AppMeta.icon.
 *
 * Special-case: recyclebin swaps to the empty-state asset when nothing is binned.
 */
export function AppIcon({ id, size = 24 }: { id: string; size?: number }) {
  // Recycle bin variant — must be a hook call, not a conditional, so do it unconditionally.
  const binCount = useOS((s) => (id === "recyclebin" ? s.recycleBin.length : 0));

  let assetSrc: string | undefined = APP_ICON_IMG[id];
  if (id === "recyclebin") {
    assetSrc = binCount > 0 ? APP_ICON_IMG.recyclebin : APP_ICON_IMG.recyclebin_empty;
  }

  if (assetSrc) {
    return (
      <img
        src={assetSrc}
        alt=""
        width={size}
        height={size}
        className="pixel-img"
        draggable={false}
      />
    );
  }

  const custom = APP_ICONS[id] as ReactNode | undefined;
  if (custom) {
    return (
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {custom}
      </svg>
    );
  }

  const meta = APP_MAP[id];
  if (!meta) return null;
  return <Icon name={meta.icon} size={size} />;
}
