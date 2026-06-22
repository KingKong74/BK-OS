// Types and helpers for the Projects app.
// Everything ultimately lives as files in the user's file system
// under C:/Users/Bailey/Projects/<name>/.

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Link {
  id: string;
  label: string;
  url: string;
}

export interface ProjectSummary {
  id: string;           // fs_node id of the project folder
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  summary: ProjectSummary;
  readme: { id: string; content: string } | null;
  tasks: { id: string; tasks: Task[] };
  links: { id: string; links: Link[] };
  docsFolderId: string | null;
}

export const PROJECTS_PATH = ["C:", "Users", "Bailey", "Projects"];

export function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function defaultReadme(name: string): string {
  return `# ${name}\n\nA short description of what this project is.\n\n## Why\n\n_Why does it exist?_\n\n## Status\n\n_Where are you up to?_\n`;
}

export function emptyTasks(): Task[] { return []; }
export function emptyLinks(): Link[] { return []; }
