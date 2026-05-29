"use client";

import { useOS } from "@/os/store";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";
import { Launcher } from "./Launcher";
import { WindowFrame } from "./WindowFrame";
import { SnapPreview } from "./SnapPreview";
import { DesktopIcons } from "./DesktopIcons";
import { ContextMenu } from "./ContextMenu";
import { TaskView } from "./TaskView";

export function DesktopShell() {
  const windows = useOS((s) => s.windows);
  const launcherOpen = useOS((s) => s.launcherOpen);
  const taskViewOpen = useOS((s) => s.taskViewOpen);
  const openMenu = useOS((s) => s.openMenu);
  const openApp = useOS((s) => s.openApp);
  const resetIconPositions = useOS((s) => s.resetIconPositions);

  return (
    <div className="desktop">
      <MenuBar />
      <div
        className="desktop-surface"
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY, [
            { label: "Open Vault", icon: "lock", onSelect: () => openApp("vault") },
            { label: "Settings", icon: "settings", onSelect: () => openApp("settings") },
            { separator: true },
            { label: "Tidy icons", icon: "grid", onSelect: () => resetIconPositions() },
          ]);
        }}
      >
        <DesktopIcons />
        {windows.map((w) => (
          <WindowFrame key={w.id} win={w} />
        ))}
        <SnapPreview />
      </div>
      {launcherOpen && <Launcher />}
      {taskViewOpen && <TaskView />}
      <Dock />
      <ContextMenu />
    </div>
  );
}
