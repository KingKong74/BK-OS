"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";

type Line = { text: string; delay: number; bright?: boolean };

// Blue-screen restart messages — old-school NT/2000 BSOD style copy.
const BSOD_LINES: Line[] = [
  { text: "", delay: 80 },
  { text: "                              BAILEY.OS", delay: 250, bright: true },
  { text: "", delay: 300 },
  { text: "   A system restart is in progress.", delay: 380 },
  { text: "", delay: 200 },
  { text: "   If this is the first time you have seen this screen,", delay: 100 },
  { text: "   you have probably initiated a restart from the Start menu.", delay: 100 },
  { text: "   Please wait while the system finishes shutting down.", delay: 100 },
  { text: "", delay: 300 },
  { text: "   Closing windows ................................ done", delay: 260 },
  { text: "   Saving Post-it cache ............................ done", delay: 240 },
  { text: "   Unmounting user partition ....................... done", delay: 240 },
  { text: "   Releasing identity session ...................... done", delay: 280 },
  { text: "", delay: 240 },
  { text: "   *** Session BAILEY has been signed out ***", delay: 500, bright: true },
  { text: "", delay: 320 },
  { text: "   Reinitializing system...", delay: 280 },
  { text: "", delay: 180 },
  { text: "   Memory pool          : 16384 MB", delay: 140 },
  { text: "   Boot device          : bailey-disk0", delay: 110 },
  { text: "   Kernel image         : /system/kernel.bin", delay: 110 },
  { text: "   Boot mode            : Normal", delay: 110 },
  { text: "   Verifying integrity  : MBR signature 55AA OK", delay: 200 },
  { text: "", delay: 240 },
  { text: "   Loading bailey.os...", delay: 360, bright: true },
  { text: "   [############################################] 100%", delay: 700, bright: true },
];

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = 16;
    const cols = Math.floor(window.innerWidth / fontSize);
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const charSet =
      "アァカサタナハマヤラワガザダバパイィキシチニヒミリギジヂビピウゥクスツヌフムユルグズヅブプエェケセテネヘメレゲゼデベペオォコソトノホモヨロヲゴゾドボポヴッン0123456789ABCDEF<>{}/*+-".split("");

    // Throttle to ~30 fps so the rain feels deliberate without dragging.
    const FRAME_MS = 33;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_MS) return;
      last = now;

      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = `${fontSize}px "Lucida Console", "Consolas", monospace`;
      for (let i = 0; i < cols; i++) {
        // Paint a head character ~55% of frames per column
        if (Math.random() < 0.55) {
          const ch = charSet[Math.floor(Math.random() * charSet.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          ctx.fillStyle = "#b5ffc4";
          ctx.fillText(ch, x, y);
          if (drops[i] > 1 && Math.random() < 0.55) {
            ctx.fillStyle = "#00cc4f";
            const prev = charSet[Math.floor(Math.random() * charSet.length)];
            ctx.fillText(prev, x, y - fontSize);
          }
        }
        const y = drops[i] * fontSize;
        if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.34; // bumped from 0.22
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="matrix-canvas" />;
}

export function RestartSequence() {
  const restartPhase = useOS((s) => s.restartPhase);
  const setRestartPhase = useOS((s) => s.setRestartPhase);
  const [visibleLines, setVisibleLines] = useState<Line[]>([]);
  const skip = useRef(false);

  // Blue-screen reboot phase: feed lines in, then hand off to matrix after a hold.
  useEffect(() => {
    if (restartPhase !== "bios") {
      setVisibleLines([]);
      skip.current = false;
      return;
    }
    let cancelled = false;
    let i = 0;

    const tick = () => {
      if (cancelled) return;
      if (skip.current) {
        setVisibleLines(BSOD_LINES);
        // Hold the completed blue screen for a moment so the eye can read it,
        // then trigger the slow fade to matrix.
        setTimeout(() => { if (!cancelled) setRestartPhase("matrix"); }, 1100);
        return;
      }
      if (i >= BSOD_LINES.length) {
        // Natural end-of-script: hold the final screen briefly before fading.
        setTimeout(() => { if (!cancelled) setRestartPhase("matrix"); }, 1400);
        return;
      }
      const line = BSOD_LINES[i];
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
  }, [restartPhase, setRestartPhase]);

  if (restartPhase === "off") return null;

  // The blue-screen layer renders during both bios + matrix phases. During matrix
  // it fades out slowly while the matrix layer fades in over the top.
  const showBsod = restartPhase === "bios" || restartPhase === "matrix";
  const bsodFading = restartPhase === "matrix";

  return (
    <>
      {showBsod && (
        <div className={"reboot-overlay reboot-bsod" + (bsodFading ? " is-fading-out" : "")}>
          <div className="reboot-frame">
            {visibleLines.map((line, idx) => (
              <div key={idx} className={"reboot-line" + (line.bright ? " is-bright" : "")}>
                {line.text || "\u00A0"}
              </div>
            ))}
            <div className="reboot-cursor">_</div>
          </div>
        </div>
      )}
      {restartPhase === "matrix" && (
        <div className="reboot-overlay reboot-matrix is-fading-in" aria-hidden="true">
          <MatrixRain />
        </div>
      )}
    </>
  );
}
