"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { useMediaQuery } from "./useMediaQuery";
import { DesktopShell } from "./DesktopShell";
import { MobileShell } from "./MobileShell";
import { LockScreen } from "./LockScreen";
import { PoweredOff } from "./PoweredOff";
import { RestartSequence } from "./RestartSequence";
import { ShutdownSequence } from "./ShutdownSequence";

export function OS() {
  const scene = useOS((s) => s.scene);
  const wallpaperColor = useOS((s) => s.wallpaperColor);
  const locked = useOS((s) => s.locked);
  const poweredOff = useOS((s) => s.poweredOff);
  const restartPhase = useOS((s) => s.restartPhase);
  const shutdownPhase = useOS((s) => s.shutdownPhase);
  const initNotes = useOS((s) => s.initNotes);
  const notesReady = useOS((s) => s.notesReady);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hydrate sticky notes from /api/notes on first mount (AuthGate guarantees
  // we already have a session by the time we render).
  useEffect(() => {
    if (!notesReady) initNotes();
  }, [notesReady, initNotes]);

  if (!mounted) {
    return <div className="os-root" data-scene="win98" />;
  }

  return (
    <div
      className="os-root"
      data-scene={scene}
      style={wallpaperColor ? ({ "--wallpaper": wallpaperColor } as React.CSSProperties) : undefined}
    >
      {poweredOff ? (
        <PoweredOff />
      ) : (
        <>
          {isDesktop ? <DesktopShell /> : <MobileShell />}
          {locked && <LockScreen />}
          {restartPhase !== "off" && <RestartSequence />}
          {shutdownPhase !== "off" && <ShutdownSequence />}
        </>
      )}
    </div>
  );
}
