"use client";

import { useOS } from "@/os/store";
import { boundsForZone } from "@/os/snap";

export function SnapPreview() {
  const zone = useOS((s) => s.snapPreview);
  if (!zone || typeof window === "undefined") return null;
  const b = boundsForZone(zone, window.innerWidth, window.innerHeight);
  return (
    <div
      className="snap-preview"
      style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
      aria-hidden="true"
    />
  );
}
