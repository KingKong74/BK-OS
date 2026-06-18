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

// ─── Notes ↔ /api/notes sync helpers ────────────────────────
//
// The Zustand `stickyNotes` slice is the single source of truth for the UI.
// Every action below updates the slice optimistically, then syncs to the
// server in the background (with debouncing for high-frequency events like
// drag-move and text-typing).
//
// Notes created BEFORE server-sync existed (e.g. the legacy "n1" welcome note
// or anything still in localStorage) have non-UUID ids. We skip API calls for
// those ids — they live only on the client and disappear when cleared.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isSyncableId(id: string): boolean {
  return UUID_RE.test(id);
}

function clientUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (won't be hit in modern browsers / Node 20+)
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");
}

const POSITION_DEBOUNCE_MS = 500;
const TEXT_DEBOUNCE_MS = 800;

const pendingMoves = new Map<string, { x: number; y: number }>();
let moveTimer: ReturnType<typeof setTimeout> | null = null;

const pendingText = new Map<string, string>();
let textTimer: ReturnType<typeof setTimeout> | null = null;

function flushMoves() {
  pendingMoves.forEach((pos, id) => {
    fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionX: Math.round(pos.x),
        positionY: Math.round(pos.y),
      }),
    }).catch(() => { /* ignore — UI already updated */ });
  });
  pendingMoves.clear();
  moveTimer = null;
}

function scheduleMoveSync(id: string, x: number, y: number) {
  pendingMoves.set(id, { x, y });
  if (moveTimer) clearTimeout(moveTimer);
  moveTimer = setTimeout(flushMoves, POSITION_DEBOUNCE_MS);
}

function flushText() {
  pendingText.forEach((text, id) => {
    fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    }).catch(() => {});
  });
  pendingText.clear();
  textTimer = null;
}

function scheduleTextSync(id: string, text: string) {
  pendingText.set(id, text);
  if (textTimer) clearTimeout(textTimer);
  textTimer = setTimeout(flushText, TEXT_DEBOUNCE_MS);
}

// Fire any pending changes before page unloads (best effort).
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (moveTimer) { clearTimeout(moveTimer); flushMoves(); }
    if (textTimer) { clearTimeout(textTimer); flushText(); }
  });
}

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
  notesReady: boolean;
  recycleBin: RecycledItem[];
  deletedPaths: string[];
  desktopShortcuts: DesktopShortcut[];
  pathLabels: Record<string, string>;
  vfsAdditions: Record<string, FsNode[]>;
  fileContents: Record<string, string>;
  clipboard: { kind: "app-shortcut"; appId: string; label?: string } | null;
  notepadInitial: { path: string[]; name: string } | null;
  restartPhase: "off" | "bios" | "matrix";
  shutdownPhase: "off" | "running";

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
  initNotes: () => Promise<void>;
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
  setShutdownPhase: (phase: OSState["shutdownPhase"]) => void;
  finishShutdown: () => void;

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
      stickyNotes: [],   // hydrated from /api/notes on mount, not from localStorage
      notesReady: false,
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
      shutdownPhase: "off",

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
        set({
          shutdownPhase: "running",
          windows: [],
          focusedId: null,
          launcherOpen: false,
          menu: null,
          taskViewOpen: false,
          locked: true,
        }),
      finishShutdown: () => set({ poweredOff: true, shutdownPhase: "off" }),
      powerOn: () => set({ poweredOff: false, locked: true, restartPhase: "off", shutdownPhase: "off" }),
      sleep: () => set({ locked: true, launcherOpen: false, menu: null, taskViewOpen: false }),
      restart: () => {
        set({
          windows: [],
          focusedId: null,
          taskViewOpen: false,
          launcherOpen: false,
          menu: null,
          locked: true,
          poweredOff: false,
          restartPhase: "bios",
          shutdownPhase: "off",
        });
      },
      setRestartPhase: (phase) => set({ restartPhase: phase }),
      setShutdownPhase: (phase) => set({ shutdownPhase: phase }),
      setVaultInitialPath: (path) => set({ vaultInitialPath: path }),

      // ─── Notes (server-synced) ─────────────────────────────────

      initNotes: async () => {
        try {
          const res = await fetch("/api/notes");
          if (!res.ok) {
            // 401 = not signed in (AuthGate will redirect anyway). Other errors:
            // leave stickyNotes empty so the user can still see the empty state.
            set({ notesReady: true });
            return;
          }
          const data = await res.json();
          const stickyNotes: StickyNote[] = (data.notes ?? []).map((n: {
            id: string;
            body?: string;
            color?: string;
            positionX?: number;
            positionY?: number;
            closed?: boolean;
          }) => ({
            id: n.id,
            text: n.body ?? "",
            x: n.positionX,
            y: n.positionY,
            color: (n.color ?? "yellow") as NoteColor,
            closed: n.closed ?? false,
          }));
          set({ stickyNotes, notesReady: true });
        } catch {
          set({ notesReady: true });
        }
      },

      addNote: (x, y) => {
        const state = get();
        const id = clientUuid();
        const posX = x ?? 120 + (state.stickyNotes.length % 6) * 24;
        const posY = y ?? 120 + (state.stickyNotes.length % 6) * 24;

        // Optimistic
        set((s) => ({
          stickyNotes: [
            ...s.stickyNotes,
            { id, text: "", x: posX, y: posY, color: "yellow", closed: false },
          ],
        }));

        // Server
        fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            body: "",
            color: "yellow",
            positionX: Math.round(posX),
            positionY: Math.round(posY),
            closed: false,
          }),
        }).catch(() => {});
      },

      updateNote: (id, text) => {
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, text } : n)),
        }));
        if (isSyncableId(id)) scheduleTextSync(id, text);
      },

      removeNote: (id) => {
        set((s) => ({ stickyNotes: s.stickyNotes.filter((n) => n.id !== id) }));
        pendingText.delete(id);
        pendingMoves.delete(id);
        if (isSyncableId(id)) {
          fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
        }
      },

      closeNote: (id) => {
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, closed: true } : n)),
        }));
        if (isSyncableId(id)) {
          fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ closed: true }),
          }).catch(() => {});
        }
      },

      openNote: (id) => {
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, closed: false } : n)),
        }));
        if (isSyncableId(id)) {
          fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ closed: false }),
          }).catch(() => {});
        }
      },

      setNoteColor: (id, color) => {
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, color } : n)),
        }));
        if (isSyncableId(id)) {
          fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ color }),
          }).catch(() => {});
        }
      },

      moveNote: (id, x, y) => {
        const clampedX = Math.max(0, x);
        const clampedY = Math.max(MENUBAR_H + 2, y);
        set((s) => ({
          stickyNotes: s.stickyNotes.map((n) =>
            n.id === id ? { ...n, x: clampedX, y: clampedY } : n
          ),
        }));
        if (isSyncableId(id)) scheduleMoveSync(id, clampedX, clampedY);
      },

      // ───────────────────────────────────────────────────────────

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
      // NOTE: stickyNotes is intentionally NOT persisted here — it loads from
      // /api/notes via initNotes() on every page mount so the data is always
      // server-truthy and cross-device consistent.
      partialize: (s) => ({
        scene: s.scene,
        windows: s.windows,
        focusedId: s.focusedId,
        zCounter: s.zCounter,
        iconPositions: s.iconPositions,
        gridSnap: s.gridSnap,
        pinnedApps: s.pinnedApps,
        poweredOff: s.poweredOff,
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
