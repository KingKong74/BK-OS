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
  const locked = useOS((s) => s.locked);
  const poweredOff = useOS((s) => s.poweredOff);
  const restartPhase = useOS((s) => s.restartPhase);
  const shutdownPhase = useOS((s) => s.shutdownPhase);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="os-root" data-scene="win98" />;
  }

  return (
    <div className="os-root" data-scene={scene}>
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
