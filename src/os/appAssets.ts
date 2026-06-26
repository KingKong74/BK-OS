/**
 * Map of app id (or shared visual role) to a PNG asset under /public/icons/.
 * AppIcon prefers these over hand-drawn SVGs whenever a value is present.
 *
 * The Recycle Bin has empty/full variants — AppIcon picks the right one at
 * render time based on whether the bin currently holds anything.
 */
export const APP_ICON_IMG: Record<string, string> = {
  // Shell
  _start: "/icons/windows.png",

  // Built-in apps
  mycomputer: "/icons/computer_explorer.png",
  recyclebin: "/icons/recycle_bin_full.png",
  recyclebin_empty: "/icons/recycle_bin_empty.png",
  notes: "/icons/note.png",
  notepad: "/icons/notepad.png",
  claude: "/icons/claude.png",
  calculator: "/icons/calculator.png",
  terminal: "/icons/console_prompt.png",
  taskmanager: "/icons/computer_taskmgr.png",
  freecell: "/icons/game_freecell.png",
  spider: "/icons/game_spider.png",
  hearts: "/icons/game_hearts.png",
  mine: "/icons/game_mine.png",
  // NB: "games" deliberately has no PNG — it falls through to the hand-drawn
  // joystick in appIcons.tsx so the Games folder reads distinct from Hearts.
  projects: "/icons/projects.png",
  photos: "/icons/pictures.png",
  calendar: "/icons/calendar.png",
  accounting: "/icons/chart.png",
  settings: "/icons/settings_gear.png",
  help: "/icons/help_book.png",
  tree: "/icons/tree.png",

  // Stashed for future apps / shell features
  msn: "/icons/msn3.png",
  certificate: "/icons/certificate.png",
  hourglass: "/icons/hourglass.png",
};

export const FOLDER_CLOSED = "/icons/directory_closed.png";
export const FOLDER_OPEN = "/icons/directory_open.png";
export const FILE_ARCHIVE = "/icons/directory_zipper.png";
export const FILE_EXEC = "/icons/executable.png";
export const FILE_NOTEPAD = "/icons/notepad.png";
export const FILE_PICTURES = "/icons/pictures.png";
