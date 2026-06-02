import {
  FOLDER_CLOSED,
  FOLDER_OPEN,
  FILE_ARCHIVE,
  FILE_EXEC,
  FILE_NOTEPAD,
  FILE_PICTURES,
} from "@/os/appAssets";
import type { FileKind } from "@/os/vfs";

/**
 * Folder icon. Closed by default, open via `is-open` class or via parent hover/select/active.
 */
export function FolderImg({ size = 24, open = false }: { size?: number; open?: boolean }) {
  return (
    <span
      className={"folder-img" + (open ? " is-open" : "")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/** Drive icon — for top-level disks like C:\ */
export function DriveImg({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/icons/hard_disk_drive_cool.png"
      alt=""
      width={size}
      height={size}
      className="pixel-img"
      draggable={false}
    />
  );
}

/** Picks the right ICO for a file kind. */
export function FileImg({ kind, size = 24 }: { kind: FileKind; size?: number }) {
  const src =
    kind === "image" ? FILE_PICTURES :
    kind === "doc" ? FILE_NOTEPAD :
    kind === "sheet" ? FILE_NOTEPAD :
    kind === "pdf" ? FILE_NOTEPAD :
    FILE_EXEC;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="pixel-img"
      draggable={false}
    />
  );
}

export const _folderClosed = FOLDER_CLOSED;
export const _folderOpen = FOLDER_OPEN;
