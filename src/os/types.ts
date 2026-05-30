export type SceneId = "modern" | "dark" | "classic-mac" | "terminal" | "win98";

export type IconName =
  | "lock"
  | "calculator"
  | "code"
  | "music"
  | "settings"
  | "photo"
  | "calendar"
  | "notes"
  | "grid"
  | "search"
  | "close"
  | "minimize"
  | "maximize"
  | "folder"
  | "shield"
  | "wifi"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "chevron-right"
  | "file"
  | "list"
  | "server"
  | "taskview"
  | "power"
  | "refresh"
  | "qr"
  | "external-link";

export interface AppMeta {
  id: string;
  name: string;
  icon: IconName;
  /** css color used for the icon tile background */
  accent: string;
  /** color for the icon glyph on the tile */
  accentFg: string;
  defaultSize?: { width: number; height: number };
  /** show in the dock's pinned area */
  pinned?: boolean;
  /** if set, the app is a web view that loads this URL in an iframe */
  url?: string;
}

export type SnapZone = "left" | "right" | "max" | "tl" | "tr" | "bl" | "br";

export interface WindowState {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** active snap zone, if the window is snapped */
  snap?: SnapZone | null;
  /** bounds to restore to when un-maximizing / un-snapping */
  prev?: { x: number; y: number; width: number; height: number };
}

/** Height of the top menu bar in px. Kept in sync with scenes.css. */
export const MENUBAR_H = 30;
/** Vertical space reserved for the dock when maximizing, in px. */
export const DOCK_RESERVED = 76;

export interface MenuItem {
  label?: string;
  icon?: IconName;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}
