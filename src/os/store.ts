import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP_MAP, APPS } from "./appsMeta";
import { boundsForZone } from "./snap";
import { MENUBAR_H, DOCK_RESERVED, type MenuItem, type MenuState, type SceneId, type SnapZone, type WindowState } from "./types";
import type { FsNode } from "./vfs";

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "orange";
export interface StickyNote { id: string; text: string; x?: number; y?: number; closed?: boolean; color?: NoteColor; }
export interface RecycledItem { fullPath: string; originalParent: string[]; node: FsNode; deletedAt: string; }
export interface DesktopShortcut { id: string; appId: string; label?: string; }

let idCounter = 0;
const newId = () => `w${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

interface OSState {
  scene: SceneId;
  windows: WindowState[];
  focusedId: string | null;
  zCounter: number;
  launcherOpen: boolean;
  snapPreview: SnapZone | null;
  menu: MenuState | null;
  iconPositions: Record<string, { x: number; y: number }>;
  gridSnap: boolean;
  pinnedApps: string[];
  taskViewOpen: boolean;
  locked: boolean;
  poweredOff: boolean;
  vaultInitialPath: string[] | null;
  stickyNotes: StickyNote[];
  recycleBin: RecycledItem[];
  deletedPaths: string[];
  desktopShortcuts: DesktopShortcut[];
  pathLabels: Record<string, string>;
  vfsAdditions: Record<string, FsNode[]>;
  fileContents: Record<string, string>;
  clipboard: { kind: "app-shortcut"; appId: string; label?: string } | null;
  notepadInitial: { path: string[]; name: string } | null;
  restartPhase: "off" | "bios" | "matrix";

  setScene: (scene: SceneId) => void;
  toggleLauncher: (open?: boolean) => void;
  setSnapPreview: (zone: SnapZone | null) => void;
  openMenu: (x: number, y: number, items: MenuItem[]) => void;
  closeMenu: () => void;
  setIconPosition: (id: string, x: number, y: number) => void;
  resetIconPositions: () => void;
  setGridSnap: (on: boolean) => void;
  togglePin: (id: string) => void;
  setPinnedOrder: (ids: string[]) => void;
  toggleTaskView: (open?: boolean) => void;
  lock: () => void;
  unlock: () => void;
  shutdown: () => void;
  powerOn: () => void;
  restart: () => void;
  setVaultInitialPath: (path: string[] | null) => void;
  addNote: (x?: number, y?: number) => void;
  updateNote: (id: string, text: string) => void;
  removeNote: (id: string) => void;
  closeNote: (id: string) => void;
  openNote: (id: string) => void;
  setNoteColor: (id: string, color: NoteColor) => void;
  moveNote: (id: string, x: number, y: number) => void;
  recycle: (item: RecycledItem) => void;
  restoreFromBin: (fullPath: string) => void;
  permaDelete: (fullPath: string) => void;
  emptyRecycleBin: () => void;
  addDesktopShortcut: (appId: string, x: number, y: number) => void;
  removeDesktopShortcut: (id: string) => void;
  renameDesktopShortcut: (id: string, label: string) => void;
  setPathLabel: (fullPath: string, label: string) => void;
  addVfsNode: (parentPath: string[], node: FsNode) => void;
  removeVfsNode: (parentPath: string[], name: string) => void;
  setFileContent: (fullPath: string, content: string) => void;
  setClipboard: (item: OSState["clipboard"]) => void;
  setNotepadInitial: (payload: OSState["notepadInitial"]) => void;
  requestOpenInNotepad: (path: string[], name: string) => void;
  sleep: () => void;
  setRestartPhase: (phase: OSState["restartPhase"]) => void;

  openApp: (appId: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setBounds: (id: string, b: { x: number; y: number; width: number; height: number }, snap?: SnapZone | null) => void;
  applySnap: (id: string, zone: SnapZone) => void;
  taskbarActivate: (id: string) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      scene: "win98",
      windows: [],
      focusedId: null,
      zCounter: 1,
      launcherOpen: false,
      snapPreview: null,
      menu: null,
      iconPositions: {},
      gridSnap: true,
      pinnedApps: APPS.filter((a) => a.pinned).map((a) => a.id),
      taskViewOpen: false,
      locked: false,
      poweredOff: false,
      vaultInitialPath: null,
      stickyNotes: [{ id: "n1", text: "Welcome to bailey.os.\n\nDrag me by the yellow header. The × deletes me." }],
      recycleBin: [],
      deletedPaths: [],
      desktopShortcuts: [
        { id: "mycomputer", appId: "mycomputer" },
        { id: "recyclebin", appId: "recyclebin" },
        { id: "projects", appId: "projects" },
        { id: "moniqr", appId: "moniqr" },
        { id: "claude", appId: "claude" },
        { id: "games", appId: "games" },
        { id: "help", appId: "help" },
      ],
      pathLabels: {},
      vfsAdditions: {},
      fileContents: {},
      clipboard: null,
      notepadInitial: null,
      restartPhase: "off",

      setScene: (scene) => set({ scene }),
      toggleLauncher: (open) =>
        set((s) => ({ launcherOpen: open ?? !s.launcherOpen })),
      setSnapPreview: (zone) => set({ snapPreview: zone }),
      openMenu: (x, y, items) => set({ menu: { x, y, items } }),
      closeMenu: () => set({ menu: null }),
      setIconPosition: (id, x, y) =>
        set((s) => ({
          iconPositions: { ...s.iconPositions, [id]: { x: Math.max(0, x), y: Math.max(MENUBAR_H + 4, y) } },
        })),
      resetIconPositions: () => set({ iconPositions: {} }),
      setGridSnap: (on) => set({ gridSnap: on }),
      togglePin: (id) =>
        set((s) => ({
          pinnedApps: s.pinnedApps.includes(id)
            ? s.pinnedApps.filter((p) => p !== id)
            : [...s.pinnedApps, id],
        })),
      setPinnedOrder: (ids) => set({ pinnedApps: ids }),
      toggleTaskView: (open) =>
        set((s) => ({ taskViewOpen: open ?? !s.taskViewOpen })),
      lock: () => set({ locked: true, launcherOpen: false, menu: null, taskViewOpen: false }),
      unlock: () => set({ locked: false, restartPhase: "off" }),
      shutdown: () =>
        set({ poweredOff: true, launcherOpen: false, menu: null, taskViewOpen: false, locked: false }),
      powerOn: () => set({ poweredOff: false }),
      sleep: () => set({ locked: true, launcherOpen: false, menu: null, taskViewOpen: false }),
      restart: () => {
        // Novelty reboot: close everything, kick off the BIOS phase. The
        // sequence ends with locked = true + matrix-style login.
        set({
          windows: [],
          focusedId: null,
          taskViewOpen: false,
          launcherOpen: false,
          menu: null,
          locked: true,
          poweredOff: false,
          restartPhase: "bios",
        });
      },
      setRestartPhase: (phase) => set({ restartPhase: phase }),
      setVaultInitialPath: (path) => set({ vaultInitialPath: path }),

      addNote: (x, y) =>
        set((s) => ({
          stickyNotes: [
            ...s.stickyNotes,
            {
              id: `n${Date.now().toString(36)}`,
              text: "",
              x: x ?? 120 + (s.stickyNotes.length % 6) * 24,
              y: y ?? 120 + (s.stickyNotes.length % 6) * 24,
            },
          ],
        })),
      updateNote: (id, text) =>
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, text } : n)),
        })),
      removeNote: (id) =>
        set((s) => ({ stickyNotes: s.stickyNotes.filter((n) => n.id !== id) })),
      closeNote: (id) =>
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, closed: true } : n)),
        })),
      openNote: (id) =>
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, closed: false } : n)),
        })),
      setNoteColor: (id, color) =>
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, color } : n)),
        })),
      moveNote: (id, x, y) =>
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) =>
            n.id === id ? { ...n, x: Math.max(0, x), y: Math.max(MENUBAR_H + 2, y) } : n
          ),
        })),

      recycle: (item) =>
        set((s) => ({
          recycleBin: [...s.recycleBin, item],
          deletedPaths: s.deletedPaths.includes(item.fullPath)
            ? s.deletedPaths
            : [...s.deletedPaths, item.fullPath],
        })),
      restoreFromBin: (fullPath) =>
        set((s) => ({
          recycleBin: s.recycleBin.filter((r) => r.fullPath !== fullPath),
          deletedPaths: s.deletedPaths.filter((p) => p !== fullPath),
        })),
      permaDelete: (fullPath) =>
        set((s) => ({
          recycleBin: s.recycleBin.filter((r) => r.fullPath !== fullPath),
        })),
      emptyRecycleBin: () => set({ recycleBin: [] }),

      addDesktopShortcut: (appId, x, y) =>
        set((s) => {
          const id = `sc${Date.now().toString(36)}`;
          return {
            desktopShortcuts: [...s.desktopShortcuts, { id, appId }],
            iconPositions: { ...s.iconPositions, [id]: { x: Math.max(0, x), y: Math.max(MENUBAR_H + 4, y) } },
          };
        }),
      removeDesktopShortcut: (id) =>
        set((s) => {
          const next = { ...s.iconPositions };
          delete next[id];
          return {
            desktopShortcuts: s.desktopShortcuts.filter((d) => d.id !== id),
            iconPositions: next,
          };
        }),
      renameDesktopShortcut: (id, label) =>
        set((s) => ({
          desktopShortcuts: s.desktopShortcuts.map((d) =>
            d.id === id ? { ...d, label: label || undefined } : d
          ),
        })),
      setPathLabel: (fullPath, label) =>
        set((s) => {
          const next = { ...s.pathLabels };
          if (label && label.trim()) {
            next[fullPath] = label.trim();
          } else {
            delete next[fullPath];
          }
          return { pathLabels: next };
        }),
      addVfsNode: (parentPath, node) =>
        set((s) => {
          const key = parentPath.join("/");
          const existing = s.vfsAdditions[key] ?? [];
          // Avoid duplicate name in same folder
          const sansSame = existing.filter((n) => n.name !== node.name);
          return { vfsAdditions: { ...s.vfsAdditions, [key]: [...sansSame, node] } };
        }),
      removeVfsNode: (parentPath, name) =>
        set((s) => {
          const key = parentPath.join("/");
          const existing = s.vfsAdditions[key] ?? [];
          const filtered = existing.filter((n) => n.name !== name);
          const next = { ...s.vfsAdditions };
          if (filtered.length === 0) delete next[key];
          else next[key] = filtered;
          return { vfsAdditions: next };
        }),
      setFileContent: (fullPath, content) =>
        set((s) => ({ fileContents: { ...s.fileContents, [fullPath]: content } })),
      setClipboard: (item) => set({ clipboard: item }),
      setNotepadInitial: (payload) => set({ notepadInitial: payload }),
      requestOpenInNotepad: (path, name) => {
        set({ notepadInitial: { path, name } });
        get().openApp("notepad");
      },

      openApp: (appId) => {
        let targetAppId = appId;
        if (appId === "games") {
          // Virtual app: opens the File Explorer at C:\Program Files\Games
          set({ vaultInitialPath: ["C:", "Program Files", "Games"] });
          targetAppId = "mycomputer";
        }
        const meta = APP_MAP[targetAppId];
        if (!meta) return;
        const state = get();
        const existing = state.windows.find((w) => w.appId === targetAppId);
        const z = state.zCounter + 1;

        if (existing) {
          set({
            zCounter: z,
            focusedId: existing.id,
            launcherOpen: false,
            windows: state.windows.map((w) =>
              w.id === existing.id ? { ...w, z, minimized: false } : w
            ),
          });
          return;
        }

        const count = state.windows.length;
        const size = meta.defaultSize ?? { width: 720, height: 480 };
        const win: WindowState = {
          id: newId(),
          appId: targetAppId,
          x: 80 + (count % 6) * 30,
          y: MENUBAR_H + 24 + (count % 6) * 28,
          width: size.width,
          height: size.height,
          z,
          minimized: false,
          maximized: false,
        };
        set({
          windows: [...state.windows, win],
          focusedId: win.id,
          zCounter: z,
          launcherOpen: false,
        });
      },

      closeWindow: (id) =>
        set((s) => ({
          windows: s.windows.filter((w) => w.id !== id),
          focusedId: s.focusedId === id ? null : s.focusedId,
        })),

      focusWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            focusedId: id,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, z, minimized: false } : w
            ),
          };
        }),

      moveWindow: (id, x, y) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, x: Math.max(0, x), y: clamp(y, MENUBAR_H, 100000) } : w
          ),
        })),

      resizeWindow: (id, width, height) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id
              ? { ...w, width: Math.max(320, width), height: Math.max(200, height) }
              : w
          ),
        })),

      minimizeWindow: (id) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, minimized: true } : w
          ),
          focusedId: s.focusedId === id ? null : s.focusedId,
        })),

      toggleMaximize: (id) =>
        set((s) => {
          const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
          const vh = typeof window !== "undefined" ? window.innerHeight : 800;
          return {
            windows: s.windows.map((w) => {
              if (w.id !== id) return w;
              if (w.maximized && w.prev) {
                return { ...w, ...w.prev, maximized: false, prev: undefined };
              }
              return {
                ...w,
                maximized: true,
                prev: { x: w.x, y: w.y, width: w.width, height: w.height },
                x: 0,
                y: MENUBAR_H,
                width: vw,
                height: vh - MENUBAR_H - DOCK_RESERVED,
              };
            }),
          };
        }),

      setBounds: (id, b, snap = null) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, ...b, snap, maximized: false } : w
          ),
        })),

      applySnap: (id, zone) =>
        set((s) => {
          const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
          const vh = typeof window !== "undefined" ? window.innerHeight : 800;
          const b = boundsForZone(zone, vw, vh);
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            focusedId: id,
            windows: s.windows.map((w) => {
              if (w.id !== id) return w;
              const prev =
                w.snap || w.maximized
                  ? w.prev
                  : { x: w.x, y: w.y, width: w.width, height: w.height };
              return { ...w, ...b, z, snap: zone, maximized: false, prev };
            }),
          };
        }),

      taskbarActivate: (id) =>
        set((s) => {
          const w = s.windows.find((win) => win.id === id);
          if (!w) return {};
          // focused & visible -> minimize; otherwise focus/restore
          if (s.focusedId === id && !w.minimized) {
            return {
              focusedId: null,
              windows: s.windows.map((win) =>
                win.id === id ? { ...win, minimized: true } : win
              ),
            };
          }
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            focusedId: id,
            windows: s.windows.map((win) =>
              win.id === id ? { ...win, z, minimized: false } : win
            ),
          };
        }),
    }),
    {
      name: "bailey-os",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        scene: s.scene,
        windows: s.windows,
        focusedId: s.focusedId,
        zCounter: s.zCounter,
        iconPositions: s.iconPositions,
        gridSnap: s.gridSnap,
        pinnedApps: s.pinnedApps,
        poweredOff: s.poweredOff,
        stickyNotes: s.stickyNotes,
        recycleBin: s.recycleBin,
        deletedPaths: s.deletedPaths,
        desktopShortcuts: s.desktopShortcuts,
        pathLabels: s.pathLabels,
        vfsAdditions: s.vfsAdditions,
        fileContents: s.fileContents,
      }),
    }
  )
);
