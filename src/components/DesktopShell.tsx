"use client";

import { useEffect } from "react";
import { useOS } from "@/os/store";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";
import { Launcher } from "./Launcher";
import { WindowFrame } from "./WindowFrame";
import { SnapPreview } from "./SnapPreview";
import { DesktopIcons, DESKTOP_PATH } from "./DesktopIcons";
import { StickyNotes } from "./StickyNotes";
import { ContextMenu } from "./ContextMenu";
import { TaskView } from "./TaskView";
import { CommandPalette } from "./CommandPalette";
import { resolvePath, createFsNode } from "@/hooks/useFs";

export function DesktopShell() {
  const windows = useOS((s) => s.windows);
  const launcherOpen = useOS((s) => s.launcherOpen);
  const taskViewOpen = useOS((s) => s.taskViewOpen);
  const openMenu = useOS((s) => s.openMenu);
  const openApp = useOS((s) => s.openApp);
  const resetIconPositions = useOS((s) => s.resetIconPositions);
  const addNote = useOS((s) => s.addNote);
  const addDesktopShortcut = useOS((s) => s.addDesktopShortcut);
  const setIconPosition = useOS((s) => s.setIconPosition);
  const clipboard = useOS((s) => s.clipboard);
  const reflowViewport = useOS((s) => s.reflowViewport);

  // Keep windows on-screen when the viewport changes size. rAF-debounced so a
  // drag-resize of the browser doesn't thrash the store.
  useEffect(() => {
    // Persisted windows may have come from a larger screen — pull them back in.
    reflowViewport();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reflowViewport);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [reflowViewport]);

  // Create a new server-backed item on the Desktop folder.
  // Returns a promise; we fire-and-forget from the menu callback.
  const createOnDesktop = async (
    type: "file" | "folder",
    baseName: string,
    kind: string = "other",
    clientX = 0,
    clientY = 0
  ) => {
    try {
      const { id: desktopId } = await resolvePath(["C:", "Users", "Bailey", "Desktop"]);
      if (!desktopId) return;
      // Generate a unique name by checking existing children
      const res = await fetch(`/api/fs/list?parentId=${desktopId}`);
      const data = await res.json();
      const existing: string[] = (data.children || []).map((c: { name: string }) => c.name);
      let name = baseName;
      let i = 2;
      while (existing.includes(name)) {
        const dotIdx = baseName.lastIndexOf(".");
        if (dotIdx > 0) {
          name = `${baseName.slice(0, dotIdx)} (${i})${baseName.slice(dotIdx)}`;
        } else {
          name = `${baseName} (${i})`;
        }
        i++;
      }
      const node = await createFsNode(desktopId, name, type, kind, type === "file" ? "" : undefined);
      // Position the new icon near the click location
      setIconPosition(`srv:${node.id}`, clientX - 40, clientY - 40);
      // The DesktopIcons component will pick up the new child on next refresh tick;
      // a manual reload helps ensure freshness.
      window.dispatchEvent(new CustomEvent("bkos:fs-refresh"));
    } catch (e) {
      console.error("create failed:", e);
    }
  };

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
              onSelect: () => { createOnDesktop("folder", "New folder", "other", clientX, clientY); },
            },
            {
              label: "New text document",
              icon: "notes",
              onSelect: () => { createOnDesktop("file", "New Text Document.txt", "doc", clientX, clientY); },
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
      <CommandPalette />
    </div>
  );
}
