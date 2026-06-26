"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global loading indicator, Win98-style: while any fetch is in flight we keep
 * the normal arrow cursor and trail a small animated hourglass just below-right
 * of it (the classic "working in background" pointer). The sand drains on a
 * loop. We detect loading by patching window.fetch and counting in-flight
 * requests — almost every "app is loading" path in BK-OS goes through fetch
 * (useFs, notes, search, infra…), so this one hook covers them all.
 *
 * Users who prefer reduced motion get a static arrow+hourglass cursor instead
 * (see the prefers-reduced-motion block in globals.css, keyed off body.bkos-busy).
 */
export function BusyCursor() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const countRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const apply = (b: boolean) => {
      busyRef.current = b;
      setBusy(b);
      document.body.classList.toggle("bkos-busy", b);
    };

    // Position the hourglass directly on pointer move — no React re-render per
    // mousemove. We keep the last position so it appears at the cursor.
    const onMove = (e: PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (elRef.current) {
        elRef.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 8}px)`;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Show after a short delay so quick requests don't flash the hourglass.
    const recompute = () => {
      const active = countRef.current > 0;
      if (active) {
        if (!busyRef.current && timerRef.current === null) {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            if (countRef.current > 0) apply(true);
          }, 150);
        }
      } else {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (busyRef.current) apply(false);
      }
    };

    const origFetch = window.fetch;
    window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
      countRef.current++;
      recompute();
      // finally() fires once response headers arrive (for streaming responses
      // too), so long-lived log/stat streams don't pin us "busy" forever.
      return origFetch.apply(this, args).finally(() => {
        countRef.current = Math.max(0, countRef.current - 1);
        recompute();
      });
    } as typeof fetch;

    return () => {
      window.fetch = origFetch;
      window.removeEventListener("pointermove", onMove);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      document.body.classList.remove("bkos-busy");
    };
  }, []);

  if (!busy) return null;
  const { x, y } = posRef.current;
  return (
    <div
      ref={elRef}
      className="bkos-hourglass"
      aria-hidden="true"
      style={{ transform: `translate(${x + 16}px, ${y + 8}px)` }}
    >
      <svg viewBox="0 0 18 22" width="18" height="22">
        <rect x="2" y="1" width="14" height="2" fill="#3a2a10" />
        <rect x="2" y="19" width="14" height="2" fill="#3a2a10" />
        <polygon points="3,3 15,3 9,11" fill="#d8edf4" stroke="#3a2a10" strokeWidth="0.7" />
        <polygon points="9,11 3,19 15,19" fill="#d8edf4" stroke="#3a2a10" strokeWidth="0.7" />
        <polygon className="hg-top" points="4,4 14,4 9,10" fill="#e8b84a" />
        <polygon className="hg-bot" points="9,12 5,18 13,18" fill="#e8b84a" />
        <rect className="hg-stream" x="8.4" y="10" width="1.2" height="8" fill="#e8b84a" />
      </svg>
    </div>
  );
}
