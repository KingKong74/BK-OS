"use client";

import { useOS } from "@/os/store";
import { listChildren, uniqueName } from "@/os/vfs";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";
import { Launcher } from "./Launcher";
import { WindowFrame } from "./WindowFrame";
import { SnapPreview } from "./SnapPreview";
import { DesktopIcons, DESKTOP_PATH } from "./DesktopIcons";
import { StickyNotes } from "./StickyNotes";
import { ContextMenu } from "./ContextMenu";
import { TaskView } from "./TaskView";

export function DesktopShell() {
  const windows = useOS((s) => s.windows);
  const launcherOpen = useOS((s) => s.launcherOpen);
  const taskViewOpen = useOS((s) => s.taskViewOpen);
  const openMenu = useOS((s) => s.openMenu);
  const openApp = useOS((s) => s.openApp);
  const resetIconPositions = useOS((s) => s.resetIconPositions);
  const addNote = useOS((s) => s.addNote);
  const addDesktopShortcut = useOS((s) => s.addDesktopShortcut);
  const addVfsNode = useOS((s) => s.addVfsNode);
  const vfsAdditions = useOS((s) => s.vfsAdditions);
  const setIconPosition = useOS((s) => s.setIconPosition);
  const clipboard = useOS((s) => s.clipboard);

  const desktopExisting = () =>
    listChildren(DESKTOP_PATH, vfsAdditions).map((n) => n.name);

  return (
    <div className="desktop">
      <MenuBar />
      <div
        className="desktop-surface"
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest(".desktop-icon, .sticky-note-floating, .window")) return;
          e.preventDefault();
          const { clientX, clientY } = e;
          openMenu(clientX, clientY, [
            {
              label: "New folder",
              icon: "folder",
              onSelect: () => {
                const name = uniqueName("New folder", desktopExisting());
                addVfsNode(DESKTOP_PATH, { type: "folder", name, children: [] });
                setIconPosition(`vfs:${name}`, clientX - 40, clientY - 40);
              },
            },
            {
              label: "New text document",
              icon: "notes",
              onSelect: () => {
                const name = uniqueName("New Text Document.txt", desktopExisting());
                addVfsNode(DESKTOP_PATH, {
                  type: "file",
                  name,
                  kind: "doc",
                  size: 0,
                  modified: new Date().toISOString().slice(0, 10),
                });
                setIconPosition(`vfs:${name}`, clientX - 40, clientY - 40);
              },
            },
            { label: "New Post-it", icon: "notes", onSelect: () => addNote(clientX, clientY) },
            { separator: true },
            {
              label: "Paste",
              disabled: !clipboard,
              onSelect: () => {
                if (clipboard && clipboard.kind === "app-shortcut") {
                  addDesktopShortcut(clipboard.appId, clientX - 36, clientY - 36);
                }
              },
            },
            { separator: true },
            { label: "Open My Computer", icon: "folder", onSelect: () => openApp("mycomputer") },
            { label: "Settings", icon: "settings", onSelect: () => openApp("settings") },
            { separator: true },
            { label: "Tidy icons", icon: "grid", onSelect: () => resetIconPositions() },
          ]);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-bailey-app")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
          const appId = e.dataTransfer.getData("application/x-bailey-app");
          if (!appId) return;
          e.preventDefault();
          addDesktopShortcut(appId, e.clientX - 36, e.clientY - 36);
        }}
      >
        <DesktopIcons />
        <StickyNotes />
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
