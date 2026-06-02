"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";

type Line = { text: string; delay: number; bright?: boolean };

const SHUTDOWN_LINES: Line[] = [
  { text: "", delay: 80 },
  { text: "                              BAILEY.OS", delay: 220, bright: true },
  { text: "", delay: 250 },
  { text: "   Shutting down...", delay: 280, bright: true },
  { text: "", delay: 200 },
  { text: "   Saving open documents ......................... done", delay: 220 },
  { text: "   Closing windows ............................... done", delay: 200 },
  { text: "   Flushing Post-it cache ........................ done", delay: 200 },
  { text: "   Releasing identity session .................... done", delay: 220 },
  { text: "   Flushing disk caches .......................... done", delay: 200 },
  { text: "", delay: 200 },
  { text: "   *** Session BAILEY has been signed out ***", delay: 380, bright: true },
  { text: "", delay: 220 },
  { text: "   Powering off system .........................   ", delay: 320 },
];

export function ShutdownSequence() {
  const shutdownPhase = useOS((s) => s.shutdownPhase);
  const finishShutdown = useOS((s) => s.finishShutdown);
  const [visibleLines, setVisibleLines] = useState<Line[]>([]);
  const [stage, setStage] = useState<"text" | "collapse">("text");
  const skip = useRef(false);

  useEffect(() => {
    if (shutdownPhase !== "running") {
      setVisibleLines([]);
      setStage("text");
      skip.current = false;
      return;
    }
    let cancelled = false;
    let i = 0;

    const tick = () => {
      if (cancelled) return;
      if (skip.current) {
        setVisibleLines(SHUTDOWN_LINES);
        setTimeout(() => { if (!cancelled) setStage("collapse"); }, 400);
        return;
      }
      if (i >= SHUTDOWN_LINES.length) {
        setTimeout(() => { if (!cancelled) setStage("collapse"); }, 500);
        return;
      }
      const line = SHUTDOWN_LINES[i];
      setVisibleLines((prev) => [...prev, line]);
      i++;
      setTimeout(tick, line.delay);
    };
    tick();

    const onSkip = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.key === "Escape") return;
      skip.current = true;
    };
    window.addEventListener("keydown", onSkip);
    window.addEventListener("mousedown", onSkip);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onSkip);
      window.removeEventListener("mousedown", onSkip);
    };
  }, [shutdownPhase]);

  // After the CRT collapse animation finishes, flip the OS to poweredOff.
  useEffect(() => {
    if (stage !== "collapse") return;
    const timer = setTimeout(() => {
      finishShutdown();
    }, 1200); // matches the CSS collapse keyframe duration
    return () => clearTimeout(timer);
  }, [stage, finishShutdown]);

  if (shutdownPhase !== "running") return null;

  return (
    <div className={"shutdown-overlay" + (stage === "collapse" ? " is-collapsing" : "")}>
      <div className="shutdown-screen">
        <div className="reboot-frame">
          {visibleLines.map((line, idx) => (
            <div key={idx} className={"reboot-line" + (line.bright ? " is-bright" : "")}>
              {line.text || "\u00A0"}
            </div>
          ))}
          <div className="reboot-cursor">_</div>
        </div>
      </div>
    </div>
  );
}
