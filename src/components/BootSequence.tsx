"use client";

import { useEffect, useState } from "react";

/**
 * A brief Y2K boot screen shown on first load when Y2K effects are on:
 * "Starting BK-OS..." in a chunky pixel font, a progress bar and a few boot
 * log lines, then it fades out to reveal the desktop. Cosmetic only.
 */

const BOOT_LINES = [
  "Detecting hardware ............ OK",
  "HIMEM.SYS loaded .............. OK",
  "Mounting C:\\ (FAT32) .......... OK",
  "TCP/IP stack .................. READY",
  "Starting BK-OS services ....... OK",
];

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const DUR = 2200;
    const step = (now: number) => {
      if (!start) start = now;
      const p = Math.min(100, ((now - start) / DUR) * 100);
      setPct(p);
      if (p < 100) raf = requestAnimationFrame(step);
      else {
        setClosing(true);
        window.setTimeout(onDone, 420);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const shown = Math.floor((pct / 100) * BOOT_LINES.length);

  return (
    <div className={"boot-screen" + (closing ? " is-closing" : "")} aria-hidden="true">
      <div className="boot-inner">
        <div className="boot-logo">
          <svg viewBox="0 0 32 32" width="56" height="56" shapeRendering="crispEdges">
            <rect x="3" y="3" width="11" height="11" fill="#e34234" />
            <rect x="18" y="3" width="11" height="11" fill="#2ea043" />
            <rect x="3" y="18" width="11" height="11" fill="#1f6feb" />
            <rect x="18" y="18" width="11" height="11" fill="#f1c40f" />
          </svg>
        </div>
        <div className="boot-title">Starting BK-OS<span className="boot-dots">...</span></div>
        <div className="boot-bar"><div className="boot-bar-fill" style={{ width: `${pct}%` }} /></div>
        <div className="boot-log">
          {BOOT_LINES.slice(0, shown).map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div className="boot-copy">© 2003 Bailey Microsystems · 64,432K RAM</div>
      </div>
      <div className="y2k-scanlines boot-scanlines" />
    </div>
  );
}
