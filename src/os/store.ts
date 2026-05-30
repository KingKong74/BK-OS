import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP_MAP, APPS } from "./appsMeta";
import { boundsForZone } from "./snap";
import { MENUBAR_H, DOCK_RESERVED, type MenuItem, type MenuState, type SceneId, type SnapZone, type WindowState } from "./types";

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
      scene: "modern",
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
      unlock: () => set({ locked: false }),
      shutdown: () =>
        set({ poweredOff: true, launcherOpen: false, menu: null, taskViewOpen: false, locked: false }),
      powerOn: () => set({ poweredOff: false }),
      restart: () => {
        set({ poweredOff: false, locked: false, launcherOpen: false, menu: null, taskViewOpen: false });
        if (typeof window !== "undefined") window.location.reload();
      },

      openApp: (appId) => {
        const meta = APP_MAP[appId];
        if (!meta) return;
        const state = get();
        const existing = state.windows.find((w) => w.appId === appId);
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
          appId,
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
      }),
    }
  )
);
