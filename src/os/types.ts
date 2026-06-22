export type ThemeId = "win98" | "win98-dark";

// Backward-compat: many files still reference SceneId. Alias it.
export type SceneId = ThemeId;

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
  | "external-link"
  | "sun"
  | "moon"
  | "globe"
  | "command";

export type AppOrigin = "builtin" | "addon-native" | "addon-external";
export type AppVisibility = "public" | "private" | "both";

export type AppCategory =
  | "system"
  | "productivity"
  | "development"
  | "infrastructure"
  | "media"
  | "finance"
  | "games";

export interface CommandDescriptor {
  id: string;
  label: string;
  keywords?: string[];
  icon?: IconName;
}

export interface AppManifest {
  id: string;
  name: string;
  icon: IconName;
  accent: string;
  accentFg: string;
  defaultSize?: { width: number; height: number };
  pinned?: boolean;
  url?: string;
  externalOnly?: boolean;

  origin: AppOrigin;
  visibility: AppVisibility;
  category: AppCategory;
  description?: string;
  showInLauncher?: boolean;
  commands?: CommandDescriptor[];
  hasTrayWidget?: boolean;
}

export type AppMeta = AppManifest;

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
  snap?: SnapZone | null;
  prev?: { x: number; y: number; width: number; height: number };
}

export const MENUBAR_H = 30;
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
