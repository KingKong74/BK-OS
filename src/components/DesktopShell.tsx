"use client";

import { useOS } from "@/os/store";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";
import { Launcher } from "./Launcher";
import { WindowFrame } from "./WindowFrame";
import { SnapPreview } from "./SnapPreview";
import { DesktopIcons } from "./DesktopIcons";

export function DesktopShell() {
  const windows = useOS((s) => s.windows);
  const launcherOpen = useOS((s) => s.launcherOpen);

  return (
    <div className="desktop">
      <MenuBar />
      <div className="desktop-surface">
        <DesktopIcons />
        {windows
          .filter((w) => !w.minimized)
          .map((w) => (
            <WindowFrame key={w.id} win={w} />
          ))}
        <SnapPreview />
      </div>
      {launcherOpen && <Launcher />}
      <Dock />
    </div>
  );
}
