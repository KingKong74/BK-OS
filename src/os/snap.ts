import { MENUBAR_H, DOCK_RESERVED, type SnapZone } from "./types";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Determine which snap zone (if any) the pointer is hovering. */
export function zoneFromPoint(
  px: number,
  py: number,
  vw: number,
  vh: number,
  t = 14
): SnapZone | null {
  const nearTop = py <= MENUBAR_H + t;
  const nearLeft = px <= t;
  const nearRight = px >= vw - t;
  const nearBottom = py >= vh - t;

  if (nearLeft && nearTop) return "tl";
  if (nearRight && nearTop) return "tr";
  if (nearLeft && nearBottom) return "bl";
  if (nearRight && nearBottom) return "br";
  if (nearTop) return "max";
  if (nearLeft) return "left";
  if (nearRight) return "right";
  return null;
}

/** Resolve a snap zone to concrete bounds within the work area. */
export function boundsForZone(zone: SnapZone, vw: number, vh: number): Bounds {
  const top = MENUBAR_H;
  const workH = vh - MENUBAR_H - DOCK_RESERVED;
  const halfW = Math.round(vw / 2);
  const halfH = Math.round(workH / 2);

  switch (zone) {
    case "max":
      return { x: 0, y: top, width: vw, height: workH };
    case "left":
      return { x: 0, y: top, width: halfW, height: workH };
    case "right":
      return { x: halfW, y: top, width: vw - halfW, height: workH };
    case "tl":
      return { x: 0, y: top, width: halfW, height: halfH };
    case "tr":
      return { x: halfW, y: top, width: vw - halfW, height: halfH };
    case "bl":
      return { x: 0, y: top + halfH, width: halfW, height: workH - halfH };
    case "br":
      return { x: halfW, y: top + halfH, width: vw - halfW, height: workH - halfH };
  }
}
