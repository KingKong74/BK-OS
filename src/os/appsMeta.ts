import type { AppMeta } from "./types";

/**
 * The app catalogue. This is plain data (no React) so the store can read it
 * without creating an import cycle. To add an app: add an entry here, then
 * register its component in registry.tsx.
 *
 * The `icon` field is a fallback used only when no custom retro icon exists
 * in appIcons.tsx for this id.
 */
export const APPS: AppMeta[] = [
  { id: "mycomputer", name: "My Computer", icon: "server", accent: "#dcdcdc", accentFg: "#000000", pinned: true, defaultSize: { width: 760, height: 500 } },
  { id: "recyclebin", name: "Recycle Bin", icon: "file", accent: "#c0c0c0", accentFg: "#000000", defaultSize: { width: 620, height: 440 } },
  { id: "notes", name: "Post-it", icon: "notes", accent: "transparent", accentFg: "#000000", defaultSize: { width: 600, height: 460 } },
  { id: "notepad", name: "Notepad", icon: "notes", accent: "transparent", accentFg: "#000000", defaultSize: { width: 640, height: 460 } },
  { id: "calculator", name: "Calculator", icon: "calculator", accent: "#dcdcdc", accentFg: "#000000", defaultSize: { width: 280, height: 380 } },
  { id: "terminal", name: "Terminal", icon: "code", accent: "#000000", accentFg: "#4cf389", defaultSize: { width: 640, height: 420 } },
  { id: "taskmanager", name: "Task Manager", icon: "list", accent: "#dcdcdc", accentFg: "#000000", defaultSize: { width: 560, height: 440 } },
  { id: "freecell", name: "FreeCell", icon: "grid", accent: "transparent", accentFg: "#ffffff", defaultSize: { width: 720, height: 560 } },
  { id: "spider", name: "Spider", icon: "grid", accent: "transparent", accentFg: "#ffffff", defaultSize: { width: 720, height: 560 } },
  { id: "hearts", name: "Hearts", icon: "grid", accent: "transparent", accentFg: "#ffffff", defaultSize: { width: 720, height: 560 } },
  { id: "mine", name: "Minesweeper", icon: "grid", accent: "transparent", accentFg: "#ffffff", defaultSize: { width: 540, height: 580 } },
  { id: "tree", name: "Tree", icon: "grid", accent: "transparent", accentFg: "#ffffff", defaultSize: { width: 640, height: 480 } },
  { id: "help", name: "Help", icon: "shield", accent: "transparent", accentFg: "#000000", defaultSize: { width: 760, height: 540 } },
  { id: "games", name: "Games", icon: "folder", accent: "transparent", accentFg: "#000000" },
  { id: "projects", name: "Projects", icon: "code", accent: "#caa46a", accentFg: "#26215C", pinned: true, defaultSize: { width: 800, height: 520 } },
  { id: "accounting", name: "Accounting", icon: "calculator", accent: "#E6F1FB", accentFg: "#0C447C", defaultSize: { width: 820, height: 540 } },
  { id: "calendar", name: "Calendar", icon: "calendar", accent: "#FAECE7", accentFg: "#712B13", defaultSize: { width: 720, height: 520 } },
  { id: "photos", name: "Photos", icon: "photo", accent: "#EAF3DE", accentFg: "#173404", defaultSize: { width: 760, height: 500 } },
  { id: "music", name: "Music", icon: "music", accent: "#FBEAF0", accentFg: "#4B1528", defaultSize: { width: 420, height: 320 } },
  { id: "vault", name: "Vault", icon: "lock", accent: "#8a8a8a", accentFg: "#ffffff", defaultSize: { width: 760, height: 500 } },
  { id: "settings", name: "Settings", icon: "settings", accent: "#F1EFE8", accentFg: "#2C2C2A", pinned: true, defaultSize: { width: 560, height: 460 } },
  { id: "moniqr", name: "moniqr", icon: "qr", accent: "#ffffff", accentFg: "#000000", pinned: true, defaultSize: { width: 980, height: 680 }, url: "https://moniqr.com" },
  { id: "claude", name: "Claude", icon: "shield", accent: "transparent", accentFg: "#000000", defaultSize: { width: 1080, height: 720 }, url: "https://claude.ai", externalOnly: true },
];

export const APP_MAP: Record<string, AppMeta> = Object.fromEntries(
  APPS.map((a) => [a.id, a])
);

export function getApp(id: string): AppMeta | undefined {
  return APP_MAP[id];
}
