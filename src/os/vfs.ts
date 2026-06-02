import type { IconName } from "./types";

export type FileKind = "image" | "pdf" | "doc" | "sheet" | "app" | "other";

export interface FileNode {
  type: "file";
  name: string;
  kind: FileKind;
  size: number;
  modified: string;
  appId?: string;
}

export interface FolderNode {
  type: "folder";
  name: string;
  children: FsNode[];
  /** Top-level drive marker — renders with a drive icon */
  drive?: boolean;
}

export type FsNode = FileNode | FolderNode;

function file(name: string, kind: FileKind, size: number, modified: string): FileNode {
  return { type: "file", name, kind, size, modified };
}
function folder(name: string, children: FsNode[]): FolderNode {
  return { type: "folder", name, children };
}
function drive(letter: string, children: FsNode[]): FolderNode {
  return { type: "folder", name: `${letter}:`, children, drive: true };
}
function appLauncher(name: string, appId: string): FileNode {
  return { type: "file", name, kind: "app", size: 0, modified: "2026-05-31", appId };
}

/**
 * Filesystem root. The top level is "My Computer" containing drives.
 * Drives are flagged so they can be rendered with a drive icon and shown as
 * `C:\…` in the address bar. Vault and other drives can be appended here
 * once their backing storage exists.
 */
export const VFS_ROOT: FolderNode = folder("My Computer", [
  drive("C", [
    folder("Users", [
      folder("Bailey", [
        folder("Desktop", []),
        folder("Documents", [
          folder("Financial", [
            folder("Statements", [
              file("anz-2026-04.pdf", "pdf", 180_000, "2026-05-02"),
              file("anz-2026-03.pdf", "pdf", 176_000, "2026-04-02"),
            ]),
            folder("Brokerage", [
              file("positions.csv", "sheet", 42_000, "2026-05-20"),
              file("dividends-FY25.xlsx", "sheet", 88_000, "2026-05-12"),
            ]),
            file("budget.xlsx", "sheet", 132_000, "2026-05-18"),
          ]),
          folder("Tax", [
            folder("FY25", [
              file("return-FY25-draft.pdf", "pdf", 420_000, "2026-05-12"),
              file("receipts.zip", "other", 3_400_000, "2026-04-30"),
            ]),
            file("tfn-notice.pdf", "pdf", 96_000, "2025-11-03"),
          ]),
          folder("Personal", [
            file("passport-scan.pdf", "pdf", 1_240_000, "2025-09-14"),
            file("notes.txt", "doc", 4_200, "2026-05-25"),
          ]),
        ]),
        folder("Pictures", [
          folder("2025", [
            file("noosa-sunrise.raw", "image", 44_312_000, "2026-04-14"),
            file("studio-03.jpg", "image", 8_240_000, "2026-04-09"),
            file("cbd-night.jpg", "image", 9_870_000, "2026-03-22"),
            file("sunset-pier.jpg", "image", 7_650_000, "2026-03-18"),
            file("hinterland.jpg", "image", 11_200_000, "2026-02-27"),
            file("river-fog.jpg", "image", 6_980_000, "2026-02-11"),
          ]),
          folder("Prints", [
            file("noosa-A2-final.tif", "image", 128_400_000, "2026-04-20"),
            file("print-order-feb.pdf", "pdf", 240_000, "2026-02-15"),
          ]),
          file("cover-shot.jpg", "image", 5_120_000, "2026-05-01"),
        ]),
        folder("Downloads", []),
        folder("Music", []),
        folder("Videos", []),
      ]),
    ]),
    folder("Program Files", [
      folder("Games", [
        appLauncher("Hearts", "hearts"),
        appLauncher("FreeCell", "freecell"),
        appLauncher("Spider", "spider"),
        appLauncher("Minesweeper", "mine"),
        appLauncher("Tree", "tree"),
      ]),
    ]),
    folder("Windows", []),
  ]),
  // Future: drive("V", [...]) for Vault when the Pi backend lands
]);

export function nodeAtPath(path: string[]): FolderNode | null {
  let node: FolderNode = VFS_ROOT;
  for (const segment of path) {
    const next = node.children.find((c) => c.type === "folder" && c.name === segment);
    if (!next || next.type !== "folder") return null;
    node = next;
  }
  return node;
}

/**
 * Walk to a path, considering user-added folders. Returns a node whose children
 * are the REAL children only — pair this with listChildren() to also include additions.
 */
export function resolveNode(path: string[], additions: Record<string, FsNode[]>): FolderNode | null {
  let current: FolderNode = VFS_ROOT;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const parentKey = path.slice(0, i).join("/");
    const inReal = current.children.find((c) => c.type === "folder" && c.name === seg);
    if (inReal && inReal.type === "folder") { current = inReal; continue; }
    const addedSibs = additions[parentKey] ?? [];
    const inAdded = addedSibs.find((c) => c.type === "folder" && c.name === seg);
    if (inAdded && inAdded.type === "folder") {
      current = { type: "folder", name: inAdded.name, children: [] };
      continue;
    }
    return null;
  }
  return current;
}

/** Merge real + user-added children for a path, deduping by name. */
export function listChildren(path: string[], additions: Record<string, FsNode[]>): FsNode[] {
  const node = resolveNode(path, additions);
  const real = node?.children ?? [];
  const custom = additions[path.join("/")] ?? [];
  const seen = new Set(real.map((r) => r.name));
  return [...real, ...custom.filter((c) => !seen.has(c.name))];
}

/** Picks a unique "New folder" / "New folder (2)" style name. */
export function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

/** Pretty-print a path for the address bar. ["C:", "Photos"] → "C:\Photos" */
export function pathToString(path: string[]): string {
  if (path.length === 0) return VFS_ROOT.name;
  if (isDriveSegment(path[0])) {
    const rest = path.slice(1);
    return rest.length === 0 ? `${path[0]}\\` : `${path[0]}\\${rest.join("\\")}`;
  }
  return path.join("\\");
}

export function isDriveSegment(seg: string): boolean {
  return /^[A-Za-z]:$/.test(seg);
}

/** Parse an address-bar string into a path array, or null if any segment doesn't resolve. */
export function parsePath(raw: string): string[] | null {
  const trimmed = raw.trim();
  const segs = trimmed.split(/[\\/]+/).filter((s) => s.length > 0);
  if (segs.length > 0 && segs[0].toLowerCase() === VFS_ROOT.name.toLowerCase()) segs.shift();
  let node: FolderNode = VFS_ROOT;
  const resolved: string[] = [];
  for (const seg of segs) {
    const child = node.children.find(
      (c) => c.type === "folder" && c.name.toLowerCase() === seg.toLowerCase()
    );
    if (!child || child.type !== "folder") return null;
    resolved.push(child.name);
    node = child;
  }
  return resolved;
}

export function fileIcon(kind: FileKind): IconName {
  switch (kind) {
    case "image": return "photo";
    case "doc": return "notes";
    case "sheet": return "calculator";
    case "app": return "grid";
    case "pdf":
    case "other":
    default: return "file";
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
