"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { useMediaQuery } from "./useMediaQuery";
import { DesktopShell } from "./DesktopShell";
import { MobileShell } from "./MobileShell";

export function OS() {
  const scene = useOS((s) => s.scene);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: persisted windows + media query are client-only.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="os-root" data-scene="modern" />;
  }

  return (
    <div className="os-root" data-scene={scene}>
      {isDesktop ? <DesktopShell /> : <MobileShell />}
    </div>
  );
}
