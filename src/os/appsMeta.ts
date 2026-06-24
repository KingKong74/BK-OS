import type { AppManifest } from "./types";

/**
 * The BK-OS app catalogue. Each manifest declares:
 *   origin — builtin (core OS), addon-native (React addon), addon-external (URL)
 *   visibility — which BK-OS instance the app appears in (public demo / private / both)
 *   category — grouping in the Start Menu
 *
 * To add an app:
 *  1) Append a manifest here
 *  2) Register its component in registry.tsx (skip if addon-external)
 *  3) That's it — Start Menu, Command Palette, search, all pick it up
 *
 * BUILT-IN apps ship with BK-OS itself. They are intentionally a small,
 * focused set. Everything else (Projects, Vault, Infrastructure, Media
 * Library, Moniqr) is an addon.
 */
export const APPS: AppManifest[] = [
  // ─── BUILT-IN: System ──────────────────────────────────────
  {
    id: "mycomputer", name: "My Computer", icon: "server",
    accent: "#dcdcdc", accentFg: "#000000", pinned: true,
    defaultSize: { width: 760, height: 500 },
    origin: "builtin", visibility: "both", category: "system",
    description: "Browse your files and folders, just like an OS.",
    commands: [
      { id: "open", label: "Open My Computer", icon: "server" },
      { id: "open-docs", label: "Open Documents folder", icon: "folder", keywords: ["documents"] },
      { id: "open-pics", label: "Open Pictures folder", icon: "photo", keywords: ["pictures", "photos"] },
    ],
  },
  {
    id: "recyclebin", name: "Recycle Bin", icon: "file",
    accent: "#c0c0c0", accentFg: "#000000",
    defaultSize: { width: 620, height: 440 },
    origin: "builtin", visibility: "both", category: "system",
    description: "Restore or permanently delete files you've thrown away.",
    commands: [{ id: "open", label: "Open Recycle Bin", icon: "file" }],
  },
  {
    id: "settings", name: "Settings", icon: "settings",
    accent: "#F1EFE8", accentFg: "#2C2C2A", pinned: true,
    defaultSize: { width: 680, height: 520 },
    origin: "builtin", visibility: "both", category: "system",
    description: "Theme, accessibility, and BK-OS preferences.",
    commands: [
      { id: "open", label: "Open Settings", icon: "settings" },
      { id: "toggle-theme", label: "Toggle dark mode", icon: "moon", keywords: ["theme", "dark", "light", "night"] },
    ],
  },
  {
    id: "help", name: "Help", icon: "shield",
    accent: "transparent", accentFg: "#000000",
    defaultSize: { width: 760, height: 540 },
    origin: "builtin", visibility: "both", category: "system",
    description: "Find your way around BK-OS.",
  },

  // ─── BUILT-IN: Productivity ────────────────────────────────
  {
    id: "notes", name: "Post-it", icon: "notes",
    accent: "transparent", accentFg: "#000000",
    defaultSize: { width: 600, height: 460 },
    origin: "builtin", visibility: "both", category: "productivity",
    description: "Sticky notes that persist to your account.",
    commands: [
      { id: "open", label: "Open Post-it list" },
      { id: "new", label: "New Post-it note", icon: "notes" },
    ],
  },
  {
    id: "notepad", name: "Notepad", icon: "notes",
    accent: "transparent", accentFg: "#000000",
    defaultSize: { width: 640, height: 460 },
    origin: "builtin", visibility: "both", category: "productivity",
    description: "Open and edit text files.",
    commands: [{ id: "open", label: "Open Notepad", icon: "notes" }],
  },
  {
    id: "calculator", name: "Calculator", icon: "calculator",
    accent: "#dcdcdc", accentFg: "#000000",
    defaultSize: { width: 280, height: 380 },
    origin: "builtin", visibility: "both", category: "productivity",
    commands: [{ id: "open", label: "Open Calculator", icon: "calculator" }],
  },

  // ─── BUILT-IN: Development ─────────────────────────────────
  {
    id: "terminal", name: "Terminal", icon: "code",
    accent: "#000000", accentFg: "#4cf389",
    defaultSize: { width: 640, height: 420 },
    origin: "builtin", visibility: "both", category: "development",
    description: "A simulated shell — fun and informational.",
    commands: [{ id: "open", label: "Open Terminal", icon: "code" }],
  },
  {
    id: "taskmanager", name: "Task Manager", icon: "list",
    accent: "#dcdcdc", accentFg: "#000000",
    defaultSize: { width: 560, height: 440 },
    origin: "builtin", visibility: "both", category: "system",
    commands: [{ id: "open", label: "Open Task Manager", icon: "list" }],
  },
  {
    id: "explorer", name: "Internet Explorer", icon: "globe",
    accent: "#0066cc", accentFg: "#ffffff",
    defaultSize: { width: 820, height: 560 },
    origin: "builtin", visibility: "both", category: "productivity",
    description: "Your web shortcuts and bookmarks.",
    commands: [{ id: "open", label: "Open Internet Explorer", icon: "globe" }],
  },

  // ─── BUILT-IN: Games ───────────────────────────────────────
  {
    id: "games", name: "Games", icon: "folder",
    accent: "transparent", accentFg: "#000000",
    origin: "builtin", visibility: "both", category: "games",
    description: "Classic Win98-era games.",
  },
  {
    id: "freecell", name: "FreeCell", icon: "grid",
    accent: "transparent", accentFg: "#ffffff",
    defaultSize: { width: 720, height: 560 },
    origin: "builtin", visibility: "both", category: "games",
  },
  {
    id: "spider", name: "Spider", icon: "grid",
    accent: "transparent", accentFg: "#ffffff",
    defaultSize: { width: 720, height: 560 },
    origin: "builtin", visibility: "both", category: "games",
  },
  {
    id: "hearts", name: "Hearts", icon: "grid",
    accent: "transparent", accentFg: "#ffffff",
    defaultSize: { width: 720, height: 560 },
    origin: "builtin", visibility: "both", category: "games",
  },
  {
    id: "mine", name: "Minesweeper", icon: "grid",
    accent: "transparent", accentFg: "#ffffff",
    defaultSize: { width: 540, height: 580 },
    origin: "builtin", visibility: "both", category: "games",
  },
  {
    id: "tree", name: "Tree", icon: "grid",
    accent: "transparent", accentFg: "#ffffff",
    defaultSize: { width: 640, height: 480 },
    origin: "builtin", visibility: "both", category: "games",
  },

  // ─── ADDON-NATIVE: Bailey's private app set ────────────────
  // These appear ONLY in the private instance until they're real apps.
  // They will fall back to PlaceholderApp in registry.tsx until built.
  {
    id: "projects", name: "Projects", icon: "code",
    accent: "#caa46a", accentFg: "#26215C",
    defaultSize: { width: 800, height: 520 },
    origin: "addon-native", visibility: "private", category: "development",
    description: "Every project as a folder. Commits, tasks, links, deploy status.",
    pinned: true,
  },
  {
    id: "vault", name: "Vault", icon: "lock",
    accent: "#8a8a8a", accentFg: "#ffffff",
    defaultSize: { width: 760, height: 500 },
    origin: "addon-native", visibility: "private", category: "system",
    description: "Encrypted passwords, documents, SSH keys.",
  },
  {
    id: "infrastructure", name: "Infrastructure", icon: "server",
    accent: "#1a1916", accentFg: "#f5a623",
    defaultSize: { width: 820, height: 540 },
    origin: "addon-native", visibility: "private", category: "infrastructure",
    description: "Your homelab — containers, domains, Tailscale, server stats.",
  },
  {
    id: "knowledge", name: "Knowledge Base", icon: "notes",
    accent: "#e3dccf", accentFg: "#3a2a14",
    defaultSize: { width: 820, height: 580 },
    origin: "addon-native", visibility: "private", category: "productivity",
    description: "Your personal wiki. Notes, research, documentation.",
  },
  {
    id: "media", name: "Media Library", icon: "photo",
    accent: "#EAF3DE", accentFg: "#173404",
    defaultSize: { width: 880, height: 600 },
    origin: "addon-native", visibility: "private", category: "media",
    description: "All your photos, videos, music — Drive-style.",
  },

  // ─── ADDON-EXTERNAL: separate deployments via iframe ───────
  {
    id: "moniqr", name: "moniqr", icon: "qr",
    accent: "#ffffff", accentFg: "#000000",
    defaultSize: { width: 980, height: 680 },
    url: "https://moniqr.com",
    origin: "addon-external", visibility: "private", category: "finance",
    description: "Accounting app for Australian sole traders.",
    pinned: true,
  },
  {
    id: "claude", name: "Claude", icon: "shield",
    accent: "transparent", accentFg: "#000000",
    defaultSize: { width: 1080, height: 720 },
    url: "https://claude.ai", externalOnly: true,
    origin: "addon-external", visibility: "private", category: "productivity",
    description: "Claude AI — opens in a new tab.",
  },
];

export const APP_MAP: Record<string, AppManifest> = Object.fromEntries(
  APPS.map((a) => [a.id, a])
);

export function getApp(id: string): AppManifest | undefined {
  return APP_MAP[id];
}

/** Apps visible in a given mode. */
export function visibleApps(mode: "public" | "private"): AppManifest[] {
  return APPS.filter((a) => a.visibility === "both" || a.visibility === mode);
}

/** Pinned apps for a given mode. */
export function visiblePinnedIds(mode: "public" | "private"): string[] {
  return visibleApps(mode).filter((a) => a.pinned).map((a) => a.id);
}
