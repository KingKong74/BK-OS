import type { ReactNode } from "react";

/**
 * Per-app retro icons. Each entry is the inner contents of a 32x32 SVG.
 * Apps not present here fall back to the stroke icon from <Icon name={meta.icon} />.
 * Use id "_start" for the Start-button logo.
 */
export const APP_ICONS: Record<string, ReactNode> = {
  // ─── Social / external — chunky Win98 pixel-art, abstract category
  // icons (NOT the literal brand logos). Hard edges, limited palette,
  // bevelled like an icon someone drew pixel-by-pixel in 1998. ───

  // GitHub → a "source code" document with syntax-highlighted lines + caret.
  github: (
    <g shapeRendering="crispEdges">
      <polygon points="6,3 21,3 26,8 26,29 6,29" fill="#f4f0e4" stroke="#000" />
      <polygon points="21,3 21,8 26,8" fill="#cdc6ad" stroke="#000" />
      <rect x="9" y="11" width="5" height="2" fill="#1f6feb" />
      <rect x="15" y="11" width="6" height="2" fill="#2ea043" />
      <rect x="11" y="15" width="4" height="2" fill="#e34234" />
      <rect x="16" y="15" width="6" height="2" fill="#8a8a8a" />
      <rect x="9" y="19" width="6" height="2" fill="#a06bff" />
      <rect x="11" y="23" width="8" height="2" fill="#1f6feb" />
      <rect x="20" y="23" width="2" height="2" fill="#000" />
    </g>
  ),

  // Instagram → an old-school chunky camera (body, lens, flash, shutter).
  instagram: (
    <g shapeRendering="crispEdges">
      <rect x="11" y="6" width="8" height="4" fill="#4a4a4a" stroke="#000" />
      <rect x="4" y="9" width="24" height="18" fill="#787878" stroke="#000" />
      <rect x="5" y="10" width="22" height="2" fill="#9c9c9c" />
      <rect x="6" y="11" width="3" height="3" fill="#f3f0a4" stroke="#000" strokeWidth="0.5" />
      <rect x="22" y="11" width="4" height="2" fill="#e34234" />
      <circle cx="16" cy="19" r="6" fill="#333" stroke="#000" />
      <circle cx="16" cy="19" r="3.4" fill="#2b5d8a" />
      <rect x="13" y="16" width="2" height="2" fill="#bcd6ee" />
    </g>
  ),

  // LinkedIn → a tiny business card: portrait box + a person + text lines.
  linkedin: (
    <g shapeRendering="crispEdges">
      <rect x="4" y="8" width="24" height="16" fill="#f6f3ea" stroke="#000" />
      <rect x="6" y="10" width="9" height="12" fill="#cfe0f2" stroke="#000" strokeWidth="0.5" />
      <circle cx="10.5" cy="14" r="2.2" fill="#0a66c2" />
      <path d="M7 22 a3.5 3.5 0 0 1 7 0 Z" fill="#0a66c2" />
      <rect x="17" y="11" width="9" height="2" fill="#0a3a6a" />
      <rect x="17" y="15" width="7" height="2" fill="#5a7a9a" />
      <rect x="17" y="19" width="9" height="2" fill="#5a7a9a" />
    </g>
  ),

  // YouTube → a CRT television with antenna, dials and a VCR play arrow.
  youtube: (
    <g shapeRendering="crispEdges">
      <path d="M13 4 L16 11 M22 3 L17 11" stroke="#7a7a7a" strokeWidth="1.5" fill="none" />
      <rect x="4" y="10" width="24" height="18" fill="#8a5a2b" stroke="#000" />
      <rect x="5" y="11" width="22" height="2" fill="#a9743a" />
      <rect x="6" y="13" width="15" height="13" fill="#b8c0b4" stroke="#000" />
      <rect x="7" y="14" width="13" height="11" fill="#566b66" />
      <polygon points="11,16 11,23 16,19.5" fill="#fff" stroke="#000" strokeWidth="0.5" />
      <circle cx="24.5" cy="16" r="1.6" fill="#3a2410" />
      <circle cx="24.5" cy="21" r="1.6" fill="#3a2410" />
    </g>
  ),

  // Games folder → an arcade joystick, distinct from the per-game icons.
  games: (
    <g shapeRendering="crispEdges">
      <polygon points="6,28 26,28 23,21 9,21" fill="#3a4a8a" stroke="#000" />
      <rect x="8" y="20" width="16" height="3" fill="#5a6ab0" stroke="#000" />
      <circle cx="21" cy="24.5" r="1.5" fill="#f1c40f" stroke="#000" strokeWidth="0.5" />
      <rect x="14" y="10" width="4" height="11" fill="#2a2a2a" stroke="#000" />
      <rect x="14" y="10" width="2" height="11" fill="#4a4a4a" />
      <circle cx="16" cy="8" r="5" fill="#e34234" stroke="#000" />
      <circle cx="14" cy="6" r="1.6" fill="#ff8a7a" />
    </g>
  ),

  _start: (
    <g transform="translate(4 4) skewY(-14)">
      <rect x="0" y="0" width="11" height="11" fill="#e34234" />
      <rect x="12" y="0" width="11" height="11" fill="#2ea043" />
      <rect x="0" y="12" width="11" height="11" fill="#1f6feb" />
      <rect x="12" y="12" width="11" height="11" fill="#f1c40f" />
    </g>
  ),

  mycomputer: (
    <>
      <rect x="3" y="5" width="26" height="17" fill="#dcdcdc" stroke="#000" />
      <rect x="5" y="7" width="22" height="13" fill="#3868a8" />
      <rect x="6" y="8" width="20" height="2" fill="#5a8acc" />
      <polygon points="12,22 20,22 22,26 10,26" fill="#dcdcdc" stroke="#000" />
      <rect x="5" y="26" width="22" height="3" fill="#e8e0c8" stroke="#000" />
    </>
  ),

  recyclebin: (
    <>
      <rect x="5" y="6" width="22" height="3" fill="#a0a0a0" stroke="#000" />
      <rect x="13" y="4" width="6" height="2" fill="#a0a0a0" stroke="#000" />
      <polygon points="8,9 24,9 22,28 10,28" fill="#c0c0c0" stroke="#000" />
      <line x1="13" y1="11" x2="13" y2="26" stroke="#808080" />
      <line x1="16" y1="11" x2="16" y2="27" stroke="#808080" />
      <line x1="19" y1="11" x2="19" y2="26" stroke="#808080" />
    </>
  ),

  notes: (
    <>
      <polygon points="6,4 24,4 28,8 28,28 6,28" fill="#fef39c" stroke="#000" />
      <polygon points="24,4 28,8 24,8" fill="#e8d870" stroke="#000" />
      <line x1="10" y1="13" x2="22" y2="13" stroke="#a08c30" />
      <line x1="10" y1="17" x2="22" y2="17" stroke="#a08c30" />
      <line x1="10" y1="21" x2="22" y2="21" stroke="#a08c30" />
      <line x1="10" y1="25" x2="17" y2="25" stroke="#a08c30" />
    </>
  ),

  calculator: (
    <>
      <rect x="6" y="3" width="20" height="26" fill="#dcdcdc" stroke="#000" />
      <rect x="8" y="5" width="16" height="6" fill="#a8c896" stroke="#000" />
      <text x="22" y="10" fontSize="5" fill="#1a3a1a" textAnchor="end" fontFamily="monospace">123</text>
      <rect x="9" y="14" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="14" y="14" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="19" y="14" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="9" y="19" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="14" y="19" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="19" y="19" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="9" y="24" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="14" y="24" width="3" height="3" fill="#909090" stroke="#404040" strokeWidth="0.5" />
      <rect x="19" y="24" width="3" height="3" fill="#dd6b3a" stroke="#404040" strokeWidth="0.5" />
    </>
  ),

  terminal: (
    <>
      <rect x="3" y="5" width="26" height="22" fill="#000" stroke="#000" />
      <rect x="3" y="5" width="26" height="3" fill="#404040" stroke="#000" />
      <circle cx="6" cy="6.5" r="0.7" fill="#e34234" />
      <circle cx="8.5" cy="6.5" r="0.7" fill="#f1c40f" />
      <circle cx="11" cy="6.5" r="0.7" fill="#2ea043" />
      <polyline points="8,14 12,17 8,20" fill="none" stroke="#4cf389" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="19" width="6" height="1.5" fill="#4cf389" />
    </>
  ),

  vault: (
    <>
      <rect x="4" y="5" width="24" height="22" fill="#8a8a8a" stroke="#000" />
      <rect x="6" y="7" width="20" height="18" fill="#b0b0b0" stroke="#404040" />
      <circle cx="14" cy="16" r="6" fill="#606060" stroke="#000" />
      <circle cx="14" cy="16" r="3" fill="#404040" />
      <line x1="14" y1="11" x2="14" y2="16" stroke="#e0e0e0" strokeWidth="1.2" />
      <rect x="21" y="14" width="4" height="4" fill="#606060" stroke="#000" />
    </>
  ),

  projects: (
    <>
      <rect x="6" y="6" width="20" height="22" fill="#caa46a" stroke="#000" />
      <rect x="11" y="3" width="10" height="4" fill="#808080" stroke="#000" />
      <line x1="9" y1="12" x2="17" y2="12" stroke="#000" />
      <line x1="9" y1="16" x2="22" y2="16" stroke="#000" />
      <line x1="9" y1="20" x2="14" y2="20" stroke="#000" />
      <line x1="9" y1="24" x2="20" y2="24" stroke="#000" />
    </>
  ),

  // Moniqr (accounting) → a pixel calculator with a receipt curling out the top.
  moniqr: (
    <g shapeRendering="crispEdges">
      <polygon points="11,2 23,2 23,12 21,10 19,12 17,10 15,12 13,10 11,12" fill="#fff" stroke="#000" />
      <rect x="13" y="4" width="8" height="1.5" fill="#9a9a9a" />
      <rect x="13" y="7" width="6" height="1.5" fill="#9a9a9a" />
      <rect x="7" y="11" width="18" height="18" fill="#b8b8b8" stroke="#000" />
      <rect x="8" y="12" width="16" height="2" fill="#d8d8d8" />
      <rect x="9" y="14" width="14" height="4" fill="#9bbf6a" stroke="#000" strokeWidth="0.5" />
      <rect x="18" y="15" width="4" height="2" fill="#2a4a1a" />
      <rect x="9" y="20" width="3" height="3" fill="#8a8a8a" />
      <rect x="13" y="20" width="3" height="3" fill="#8a8a8a" />
      <rect x="9" y="24" width="3" height="3" fill="#8a8a8a" />
      <rect x="13" y="24" width="3" height="3" fill="#8a8a8a" />
      <rect x="17" y="20" width="3" height="7" fill="#dd8a3a" />
      <rect x="21" y="20" width="3" height="7" fill="#cf7a2a" />
    </g>
  ),
};
