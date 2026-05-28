import type { IconName } from "./types";

export type FileKind = "image" | "pdf" | "doc" | "sheet" | "other";

export interface FileNode {
  type: "file";
  name: string;
  kind: FileKind;
  size: number; // bytes
  modified: string; // ISO date
}

export interface FolderNode {
  type: "folder";
  name: string;
  children: FsNode[];
}

export type FsNode = FileNode | FolderNode;

function file(name: string, kind: FileKind, size: number, modified: string): FileNode {
  return { type: "file", name, kind, size, modified };
}
function folder(name: string, children: FsNode[]): FolderNode {
  return { type: "folder", name, children };
}

/** The vault root. Everything lives under here. */
export const VFS_ROOT: FolderNode = folder("Vault", [
  folder("Photos", [
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
]);

/** Resolve a path (array of folder names from the root) to a node. */
export function nodeAtPath(path: string[]): FolderNode | null {
  let node: FolderNode = VFS_ROOT;
  for (const segment of path) {
    const next = node.children.find(
      (c) => c.type === "folder" && c.name === segment
    );
    if (!next || next.type !== "folder") return null;
    node = next;
  }
  return node;
}

export function fileIcon(kind: FileKind): IconName {
  switch (kind) {
    case "image": return "photo";
    case "doc": return "notes";
    case "sheet": return "calculator";
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
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
