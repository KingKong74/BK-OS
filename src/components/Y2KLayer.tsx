"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The persistent Y2K layer (mounted only when Y2K effects are enabled):
 *  - a faint animated CRT scanline overlay across the whole screen,
 *  - a small cryptic "system status" readout in the corner that occasionally
 *    flickers to a new string,
 *  - an occasional (~1 in 50) glitch on text under the pointer: the label
 *    briefly splits into red/cyan ghosts and jitters, then snaps back.
 */

const STATUS_STRINGS = [
  "REM:0x800F0907",
  "C:\\WIN98\\SYS> OK",
  "MEM: 64,432K",
  "IRQ7 ............ READY",
  "VGA 800x600 16M",
  "TCP/IP STACK OK",
  "CMOS CHECKSUM OK",
  "COM1: 56000 BAUD",
  "CACHE: WRITE-BACK",
  "0xDEADBEEF :: NOMINAL",
];

// Elements whose text may briefly glitch on hover.
const GLITCH_SEL = ".menubar-title, .dock-launcher-label, .desktop-icon-label, .window-title, .cmenu-label, .launcher-name, .tray-clock";

export function Y2KLayer() {
  const [status, setStatus] = useState(STATUS_STRINGS[0]);
  const [flicker, setFlicker] = useState(false);
  const idx = useRef(0);

  // Cycle the status readout at irregular intervals with a quick flicker.
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const schedule = () => {
      const delay = 3500 + Math.random() * 4500;
      timer = window.setTimeout(() => {
        if (!alive) return;
        idx.current = (idx.current + 1 + Math.floor(Math.random() * (STATUS_STRINGS.length - 1))) % STATUS_STRINGS.length;
        setStatus(STATUS_STRINGS[idx.current]);
        setFlicker(true);
        window.setTimeout(() => setFlicker(false), 240);
        schedule();
      }, delay);
    };
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // ~1 in 50 hovers on certain labels triggers a brief glitch.
  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(GLITCH_SEL) as HTMLElement | null;
      if (!el || el.classList.contains("y2k-glitch")) return;
      if (Math.random() > 0.02) return;
      el.setAttribute("data-glitch", el.textContent || "");
      el.classList.add("y2k-glitch");
      window.setTimeout(() => {
        el.classList.remove("y2k-glitch");
        el.removeAttribute("data-glitch");
      }, 430);
    };
    document.addEventListener("mouseover", onOver, true);
    return () => document.removeEventListener("mouseover", onOver, true);
  }, []);

  return (
    <>
      <div className="y2k-scanlines" aria-hidden="true" />
      <div className={"y2k-status" + (flicker ? " is-flicker" : "")} aria-hidden="true">{status}</div>
    </>
  );
}
