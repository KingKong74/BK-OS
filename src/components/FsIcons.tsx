import {
  FOLDER_CLOSED,
  FOLDER_OPEN,
  FILE_ARCHIVE,
  FILE_EXEC,
  FILE_NOTEPAD,
  FILE_PICTURES,
} from "@/os/appAssets";

// Accept any kind string — fall back to a sensible default for unknowns.
export type FileKindLoose = string;

/**
 * Folder icon. Closed by default, open via `is-open` class.
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
export function FileImg({ kind, size = 24 }: { kind: FileKindLoose; size?: number }) {
  const src =
    kind === "image" || kind === "video" ? FILE_PICTURES :
    kind === "doc" || kind === "code" || kind === "config" ? FILE_NOTEPAD :
    kind === "sheet" || kind === "pdf" ? FILE_NOTEPAD :
    kind === "binary" || kind === "audio" ? FILE_ARCHIVE :
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
