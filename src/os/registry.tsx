import type { ComponentType } from "react";
import { APP_MAP } from "./appsMeta";
import type { AppMeta } from "./types";
import { MyComputerApp } from "@/apps/MyComputerApp";
import { NotesApp } from "@/apps/NotesApp";
import { CalculatorApp } from "@/apps/CalculatorApp";
import { RecycleBinApp } from "@/apps/RecycleBinApp";
import { TerminalApp } from "@/apps/TerminalApp";
import { TaskManagerApp } from "@/apps/TaskManagerApp";
import { FreeCellApp } from "@/apps/FreeCellApp";
import { SpiderApp } from "@/apps/SpiderApp";
import { HeartsApp } from "@/apps/HeartsApp";
import { MinesweeperApp } from "@/apps/MinesweeperApp";
import { TreeApp } from "@/apps/TreeApp";
import { HelpApp } from "@/apps/HelpApp";
import { NotepadApp } from "@/apps/NotepadApp";
import { SettingsApp } from "@/apps/SettingsApp";
import { InfrastructureApp } from "@/apps/InfrastructureApp";
import { PlaceholderApp } from "@/apps/PlaceholderApp";
import { WebApp } from "@/components/WebApp";

/**
 * Map of appId -> component. Apps not listed here fall back to a placeholder,
 * so the shell keeps working even before every app is built.
 */
const COMPONENTS: Record<string, ComponentType> = {
  mycomputer: MyComputerApp,
  notes: NotesApp,
  calculator: CalculatorApp,
  recyclebin: RecycleBinApp,
  terminal: TerminalApp,
  taskmanager: TaskManagerApp,
  freecell: FreeCellApp,
  spider: SpiderApp,
  hearts: HeartsApp,
  mine: MinesweeperApp,
  tree: TreeApp,
  help: HelpApp,
  notepad: NotepadApp,
  settings: SettingsApp,
  infrastructure: InfrastructureApp,
};

export function renderApp(appId: string) {
  const meta = APP_MAP[appId] as AppMeta | undefined;
  if (!meta) return <div style={{ padding: 24 }}>Unknown app: {appId}</div>;
  if (meta.url) return <WebApp url={meta.url} name={meta.name} appId={meta.id} externalOnly={meta.externalOnly} />;
  const Comp = COMPONENTS[appId];
  if (Comp) return <Comp />;
  return <PlaceholderApp meta={meta} />;
}
