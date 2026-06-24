import type { ReactNode } from "react";

/**
 * Per-app retro icons. Each entry is the inner contents of a 32x32 SVG.
 * Apps not present here fall back to the stroke icon from <Icon name={meta.icon} />.
 * Use id "_start" for the Start-button logo.
 */
export const APP_ICONS: Record<string, ReactNode> = {
  // ─── Social / external (abstract, NOT the literal brand logos) ───
  github: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#1f2328" />
      <circle cx="11.5" cy="10.5" r="2.4" fill="#e6edf3" />
      <circle cx="11.5" cy="21.5" r="2.4" fill="#e6edf3" />
      <circle cx="21" cy="13.5" r="2.4" fill="#e6edf3" />
      <path d="M11.5 13 V19" stroke="#e6edf3" strokeWidth="2" />
      <path d="M11.5 16.5 H17 a3.5 3.5 0 0 0 3.5-3" stroke="#e6edf3" strokeWidth="2" fill="none" />
    </>
  ),
  instagram: (
    <>
      <defs>
        <linearGradient id="bk-ig" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9ce34" />
          <stop offset="0.5" stopColor="#ee2a7b" />
          <stop offset="1" stopColor="#6228d7" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="24" height="24" rx="7" fill="url(#bk-ig)" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.4" />
      <circle cx="22.5" cy="9.5" r="1.6" fill="#fff" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#0a66c2" />
      <circle cx="16" cy="12" r="3.4" fill="#fff" />
      <path d="M9.5 25 a6.5 6.5 0 0 1 13 0 Z" fill="#fff" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="7" width="26" height="18" rx="6" fill="#e0352b" />
      <polygon points="13,12 13,20 21,16" fill="#fff" />
    </>
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

  moniqr: (
    <>
      <rect x="4" y="4" width="24" height="24" fill="#ffffff" stroke="#000" />
      <rect x="6" y="6" width="7" height="7" fill="#000" />
      <rect x="8" y="8" width="3" height="3" fill="#ffffff" />
      <rect x="19" y="6" width="7" height="7" fill="#000" />
      <rect x="21" y="8" width="3" height="3" fill="#ffffff" />
      <rect x="6" y="19" width="7" height="7" fill="#000" />
      <rect x="8" y="21" width="3" height="3" fill="#ffffff" />
      <rect x="15" y="15" width="2" height="2" fill="#000" />
      <rect x="19" y="16" width="2" height="2" fill="#000" />
      <rect x="22" y="19" width="3" height="3" fill="#000" />
      <rect x="16" y="22" width="2" height="2" fill="#000" />
      <rect x="20" y="23" width="3" height="3" fill="#000" />
    </>
  ),
};
