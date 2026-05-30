import type { AppMeta } from "./types";

/**
 * The app catalogue. This is plain data (no React) so the store can read it
 * without creating an import cycle. To add an app: add an entry here, then
 * register its component in registry.tsx.
 */
export const APPS: AppMeta[] = [
  { id: "vault", name: "Vault", icon: "lock", accent: "#E1F5EE", accentFg: "#085041", pinned: true, defaultSize: { width: 760, height: 500 } },
  { id: "accounting", name: "Accounting", icon: "calculator", accent: "#E6F1FB", accentFg: "#0C447C", pinned: true, defaultSize: { width: 820, height: 540 } },
  { id: "projects", name: "Projects", icon: "code", accent: "#EEEDFE", accentFg: "#26215C", pinned: true, defaultSize: { width: 800, height: 520 } },
  { id: "calendar", name: "Calendar", icon: "calendar", accent: "#FAECE7", accentFg: "#712B13", defaultSize: { width: 720, height: 520 } },
  { id: "photos", name: "Photos", icon: "photo", accent: "#EAF3DE", accentFg: "#173404", defaultSize: { width: 760, height: 500 } },
  { id: "music", name: "Music", icon: "music", accent: "#FBEAF0", accentFg: "#4B1528", pinned: true, defaultSize: { width: 420, height: 320 } },
  { id: "notes", name: "Notes", icon: "notes", accent: "#FAEEDA", accentFg: "#633806", defaultSize: { width: 560, height: 460 } },
  { id: "settings", name: "Settings", icon: "settings", accent: "#F1EFE8", accentFg: "#2C2C2A", pinned: true, defaultSize: { width: 560, height: 460 } },
  { id: "moniqr", name: "moniqr", icon: "qr", accent: "#FBEAF0", accentFg: "#4B1528", pinned: true, defaultSize: { width: 980, height: 680 }, url: "https://moniqr.com" },
];

export const APP_MAP: Record<string, AppMeta> = Object.fromEntries(
  APPS.map((a) => [a.id, a])
);

export function getApp(id: string): AppMeta | undefined {
  return APP_MAP[id];
}
