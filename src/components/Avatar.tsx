"use client";

import type { ReactNode } from "react";
import { useOS } from "@/os/store";

/**
 * The user's profile avatar, used everywhere a face surfaces (tray button,
 * launcher header, Settings). Renders initials (default), a preset SVG, or a
 * custom uploaded image — all driven by the `profileAvatar` store field.
 */

// 8 tasteful preset avatars. Each is the inner content of a 32x32 SVG and
// draws its own circular background, so they read as round avatars.
export const PRESET_AVATARS: Record<string, ReactNode> = {
  ocean: (
    <>
      <defs><linearGradient id="av-ocean" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b8def" /><stop offset="1" stopColor="#1f4fb0" /></linearGradient></defs>
      <circle cx="16" cy="16" r="16" fill="url(#av-ocean)" />
      <path d="M3 22 L13 12 M9 26 L23 12 M17 27 L28 16" stroke="#fff" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
    </>
  ),
  sunset: (
    <>
      <defs><linearGradient id="av-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffae42" /><stop offset="1" stopColor="#ee3b6b" /></linearGradient></defs>
      <circle cx="16" cy="16" r="16" fill="url(#av-sun)" />
      <circle cx="16" cy="14" r="5" fill="#fff" opacity="0.9" />
    </>
  ),
  mint: (
    <>
      <defs><linearGradient id="av-mint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4ee0a0" /><stop offset="1" stopColor="#179c6e" /></linearGradient></defs>
      <circle cx="16" cy="16" r="16" fill="url(#av-mint)" />
      <polygon points="16,7 24,24 8,24" fill="#fff" opacity="0.85" />
    </>
  ),
  grape: (
    <>
      <defs><linearGradient id="av-grape" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a66bff" /><stop offset="1" stopColor="#5a2bb0" /></linearGradient></defs>
      <circle cx="16" cy="16" r="16" fill="url(#av-grape)" />
      <circle cx="12" cy="13" r="2.4" fill="#fff" opacity="0.9" />
      <circle cx="20" cy="13" r="2.4" fill="#fff" opacity="0.9" />
      <circle cx="16" cy="20" r="2.4" fill="#fff" opacity="0.9" />
    </>
  ),
  pixel: (
    <>
      <circle cx="16" cy="16" r="16" fill="#0f8a8a" />
      <g transform="translate(8 8) scale(1)" shapeRendering="crispEdges">
        <path fill="#5a3416" d="M5 2h6v1H5zM4 3h8v1H4zM3 4h10v2H3z" />
        <path fill="#f4c89e" d="M5 4h6v1H5zM4 5h8v3H4zM5 8h6v1H5z" />
        <rect x="6" y="6" width="1" height="1" fill="#000" />
        <rect x="9" y="6" width="1" height="1" fill="#000" />
        <rect x="7" y="8" width="2" height="1" fill="#7a3a3a" />
        <path fill="#3e6db8" d="M4 10h8v1H4zM3 11h10v1H3zM2 12h12v4H2z" />
        <path fill="#f4c89e" d="M6 9h4v1H6z" />
      </g>
    </>
  ),
  bkos: (
    <>
      <circle cx="16" cy="16" r="16" fill="#15151b" />
      <g transform="translate(9 9)">
        <rect x="0" y="0" width="6" height="6" fill="#e34234" />
        <rect x="8" y="0" width="6" height="6" fill="#2ea043" />
        <rect x="0" y="8" width="6" height="6" fill="#1f6feb" />
        <rect x="8" y="8" width="6" height="6" fill="#f1c40f" />
      </g>
    </>
  ),
  geo: (
    <>
      <circle cx="16" cy="16" r="16" fill="#e8b53a" />
      <path d="M0 16 A16 16 0 0 1 32 16 Z" fill="#1f2937" />
      <circle cx="16" cy="16" r="4" fill="#fff" />
    </>
  ),
  charcoal: (
    <>
      <circle cx="16" cy="16" r="16" fill="#2b2b33" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#6da0e0" strokeWidth="2" />
      <circle cx="16" cy="16" r="4" fill="#6da0e0" />
    </>
  ),
};

export const PRESET_IDS = Object.keys(PRESET_AVATARS);

export function Avatar({ size = 28, className }: { size?: number; className?: string }) {
  const av = useOS((s) => s.profileAvatar);
  const base = "avatar" + (className ? " " + className : "");

  if (av.type === "custom" && av.value) {
    return <img src={av.value} width={size} height={size} alt="" className={base + " avatar-img"} draggable={false} />;
  }
  if (av.type === "preset" && PRESET_AVATARS[av.value]) {
    return (
      <svg viewBox="0 0 32 32" width={size} height={size} className={base + " avatar-svg"} aria-hidden="true">
        {PRESET_AVATARS[av.value]}
      </svg>
    );
  }
  return (
    <span className={base + " avatar-initials"} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {(av.value || "BK").slice(0, 2).toUpperCase()}
    </span>
  );
}
