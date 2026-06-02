"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";

// Faux BIOS POST text — appears one line at a time. Some lines are dynamic.
type Line = { text: string; delay: number; bright?: boolean; dim?: boolean };

const BIOS_BANNER: Line[] = [
  { text: "                                                                          ", delay: 0 },
  { text: "       +==============================================================+   ", delay: 30 },
  { text: "       |                                                              |   ", delay: 20 },
  { text: "       |             B   A   I   L   E   Y  .  O   S                  |   ", delay: 30, bright: true },
  { text: "       |                Boot Manager  v0.1.0                          |   ", delay: 20 },
  { text: "       |                (c) 2026 Bailey Industries                    |   ", delay: 20 },
  { text: "       |                                                              |   ", delay: 20 },
  { text: "       +==============================================================+   ", delay: 30 },
  { text: "", delay: 60 },
];

const BIOS_BODY: Line[] = [
  { text: "Award Modular BIOS v6.00PG, An Energy Star Ally", delay: 80, bright: true },
  { text: "Copyright (C) 1984-2026, Award Software, Inc.", delay: 40, dim: true },
  { text: "", delay: 40 },
  { text: "Main Processor       : Claude i7 @ 4.2 GHz", delay: 110 },
  { text: "Math Coprocessor     : Present", delay: 60 },
  { text: "Memory Test          : __MEM__", delay: 120 },
  { text: "L2 Cache             : 8192 KB ........................ [ OK ]", delay: 60 },
  { text: "", delay: 40 },
  { text: "Detecting IDE Primary Master   ... bailey-disk0 (256 GB)", delay: 100 },
  { text: "Detecting IDE Primary Slave    ... None", delay: 30, dim: true },
  { text: "Detecting IDE Secondary Master ... None", delay: 30, dim: true },
  { text: "Detecting IDE Secondary Slave  ... None", delay: 30, dim: true },
  { text: "Detecting USB Devices          ... 2 found", delay: 80 },
  { text: "", delay: 60 },
  { text: "Verifying DMI Pool Data ................................. [ OK ]", delay: 120 },
  { text: "Initializing video adapter .............................. [ OK ]", delay: 80 },
  { text: "Loading scene profiles .................................. [ OK ]", delay: 80 },
  { text: "Mounting C:\\ ............................................ [ OK ]", delay: 80 },
  { text: "Mounting user partition  ................................ [ OK ]", delay: 80 },
  { text: "Initializing Post-it daemon ............................. [ OK ]", delay: 80 },
  { text: "Starting window manager  ................................ [ OK ]", delay: 80 },
  { text: "Loading Bailey identity provider ........................ [ OK ]", delay: 80 },
  { text: "", delay: 60 },
  { text: "POST: All systems operational.", delay: 180, bright: true },
  { text: "", delay: 100 },
  { text: "Press DEL to enter SETUP, F12 for boot menu.", delay: 60, dim: true },
  { text: "", delay: 80 },
  { text: "Loading bailey.os ...", delay: 240, bright: true },
  { text: "[##############################################################] 100%", delay: 320, bright: true },
];

const BIOS_LINES = [...BIOS_BANNER, ...BIOS_BODY];

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

    let raf = 0;
    const draw = () => {
      // Lighter alpha = longer trails. Slower drop speed = slower fall overall.
      ctx.fillStyle = "rgba(0, 0, 0, 0.055)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = `${fontSize}px "Lucida Console", "Consolas", monospace`;
      for (let i = 0; i < cols; i++) {
        // Only repaint a fresh character a fraction of frames so it feels less frantic
        if (Math.random() < 0.7) {
          const ch = charSet[Math.floor(Math.random() * charSet.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          ctx.fillStyle = "#b5ffc4";
          ctx.fillText(ch, x, y);
          if (drops[i] > 1 && Math.random() < 0.6) {
            ctx.fillStyle = "#00cc4f";
            const prev = charSet[Math.floor(Math.random() * charSet.length)];
            ctx.fillText(prev, x, y - fontSize);
          }
        }
        const y = drops[i] * fontSize;
        if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.42;
      }
      raf = requestAnimationFrame(draw);
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
  const [memKb, setMemKb] = useState(0);
  const skip = useRef(false);

  // BIOS phase: feed lines in over time, then hand off to matrix.
  useEffect(() => {
    if (restartPhase !== "bios") {
      setVisibleLines([]);
      setMemKb(0);
      skip.current = false;
      return;
    }
    let cancelled = false;
    let i = 0;
    const memTarget = 16384 * 1024; // 16384 MB in KB

    const memTick = setInterval(() => {
      if (cancelled) return;
      setMemKb((prev) => {
        const next = Math.min(prev + Math.floor(Math.random() * 320000 + 180000), memTarget);
        if (next >= memTarget) clearInterval(memTick);
        return next;
      });
    }, 35);

    const tick = () => {
      if (cancelled) return;
      if (skip.current) {
        setVisibleLines(BIOS_LINES);
        setMemKb(memTarget);
        setTimeout(() => { if (!cancelled) setRestartPhase("matrix"); }, 250);
        return;
      }
      if (i >= BIOS_LINES.length) {
        setTimeout(() => { if (!cancelled) setRestartPhase("matrix"); }, 700);
        return;
      }
      const line = BIOS_LINES[i];
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
      clearInterval(memTick);
      window.removeEventListener("keydown", onSkip);
      window.removeEventListener("mousedown", onSkip);
    };
  }, [restartPhase, setRestartPhase]);

  if (restartPhase === "off") return null;

  const renderMemLine = (line: Line) => {
    if (!line.text.includes("__MEM__")) return line.text || "\u00A0";
    if (memKb < 16384 * 1024) {
      return line.text.replace("__MEM__", `${memKb.toLocaleString("en-US")} KB`);
    }
    return line.text.replace("__MEM__", "16384 MB ........................ [ OK ]");
  };

  // The BIOS layer renders during both bios + matrix phases. During matrix it
  // fades out while the matrix layer fades in over the top.
  const showBios = restartPhase === "bios" || restartPhase === "matrix";
  const biosFading = restartPhase === "matrix";

  return (
    <>
      {showBios && (
        <div className={"reboot-overlay reboot-bios" + (biosFading ? " is-fading-out" : "")}>
          <div className="reboot-frame">
            {visibleLines.map((line, idx) => (
              <div
                key={idx}
                className={
                  "reboot-line" +
                  (line.bright ? " is-bright" : "") +
                  (line.dim ? " is-dim" : "")
                }
              >
                {renderMemLine(line)}
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
