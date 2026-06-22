"use client";

import {
  createFsNode,
  deleteFsNode,
  renameFsNode,
  resolvePath,
  updateFsText,
  type FsNodeDTO,
} from "@/hooks/useFs";
import {
  defaultReadme,
  emptyLinks,
  emptyTasks,
  PROJECTS_PATH,
  type Link,
  type ProjectData,
  type ProjectSummary,
  type Task,
} from "./types";

async function getProjectsFolderId(): Promise<string> {
  const { id } = await resolvePath(PROJECTS_PATH);
  if (!id) {
    throw new Error("Projects folder not found in your file system. It should have been seeded; try refreshing the page.");
  }
  return id;
}

/** List all projects (children of C:/Users/Bailey/Projects/). */
export async function listProjects(): Promise<ProjectSummary[]> {
  const folderId = await getProjectsFolderId();
  const res = await fetch(`/api/fs/list?parentId=${folderId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "list projects failed");
  const children: FsNodeDTO[] = data.children || [];
  return children
    .filter((c) => c.type === "folder")
    .map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Create a new project with full scaffolding. Returns the new project's summary. */
export async function createProject(name: string): Promise<ProjectSummary> {
  const folderId = await getProjectsFolderId();
  // Create the project folder
  const projectFolder = await createFsNode(folderId, name, "folder");
  // Create README.md, tasks.json, links.json, docs/
  await Promise.all([
    createFsNode(projectFolder.id, "README.md", "file", "doc", defaultReadme(name)),
    createFsNode(projectFolder.id, "tasks.json", "file", "config", JSON.stringify(emptyTasks(), null, 2)),
    createFsNode(projectFolder.id, "links.json", "file", "config", JSON.stringify(emptyLinks(), null, 2)),
    createFsNode(projectFolder.id, "docs", "folder"),
  ]);
  return {
    id: projectFolder.id,
    name: projectFolder.name,
    createdAt: projectFolder.createdAt,
    updatedAt: projectFolder.updatedAt,
  };
}

/** Delete a project (recycles the entire folder + descendants). */
export async function deleteProject(id: string): Promise<void> {
  await deleteFsNode(id);
}

/** Rename a project's root folder. */
export async function renameProject(id: string, newName: string): Promise<ProjectSummary> {
  const node = await renameFsNode(id, newName);
  return { id: node.id, name: node.name, createdAt: node.createdAt, updatedAt: node.updatedAt };
}

/** Load full project data. */
export async function loadProject(projectFolderId: string): Promise<ProjectData> {
  // List children of the project folder
  const childrenRes = await fetch(`/api/fs/list?parentId=${projectFolderId}`);
  const childrenData = await childrenRes.json();
  if (!childrenRes.ok) throw new Error(childrenData?.error || "load project failed");
  const children: FsNodeDTO[] = childrenData.children || [];

  const readme = children.find((c) => c.type === "file" && c.name === "README.md");
  const tasksFile = children.find((c) => c.type === "file" && c.name === "tasks.json");
  const linksFile = children.find((c) => c.type === "file" && c.name === "links.json");
  const docsFolder = children.find((c) => c.type === "folder" && c.name === "docs");

  // Fetch the actual file contents
  const [readmeNode, tasksNode, linksNode] = await Promise.all([
    readme ? fetchNode(readme.id) : Promise.resolve(null),
    tasksFile ? fetchNode(tasksFile.id) : Promise.resolve(null),
    linksFile ? fetchNode(linksFile.id) : Promise.resolve(null),
  ]);

  const tasks: Task[] = tasksNode?.textContent
    ? safeJsonParse(tasksNode.textContent, emptyTasks())
    : emptyTasks();
  const links: Link[] = linksNode?.textContent
    ? safeJsonParse(linksNode.textContent, emptyLinks())
    : emptyLinks();

  // Get project folder itself for the summary
  const projRes = await fetch(`/api/fs/${projectFolderId}`);
  const projData = await projRes.json();
  if (!projRes.ok || !projData.node) throw new Error("project folder not found");
  const proj = projData.node as FsNodeDTO;

  return {
    summary: {
      id: proj.id,
      name: proj.name,
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt,
    },
    readme: readmeNode
      ? { id: readmeNode.id, content: readmeNode.textContent ?? "" }
      : null,
    tasks: { id: tasksFile?.id ?? "", tasks },
    links: { id: linksFile?.id ?? "", links },
    docsFolderId: docsFolder?.id ?? null,
  };
}

async function fetchNode(id: string): Promise<FsNodeDTO | null> {
  try {
    const res = await fetch(`/api/fs/${id}`);
    const data = await res.json();
    if (!res.ok) return null;
    return data.node ?? null;
  } catch {
    return null;
  }
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

// ─── Mutations ──────────────────────────────────────────────

export async function saveReadme(id: string, content: string): Promise<void> {
  await updateFsText(id, content);
}

export async function saveTasks(id: string, tasks: Task[]): Promise<void> {
  await updateFsText(id, JSON.stringify(tasks, null, 2));
}

export async function saveLinks(id: string, links: Link[]): Promise<void> {
  await updateFsText(id, JSON.stringify(links, null, 2));
}

/** List docs (markdown files) inside a project's docs/ folder. */
export async function listDocs(docsFolderId: string): Promise<FsNodeDTO[]> {
  const res = await fetch(`/api/fs/list?parentId=${docsFolderId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "list docs failed");
  return ((data.children || []) as FsNodeDTO[]).filter((c) => c.type === "file");
}

export async function createDoc(docsFolderId: string, name: string): Promise<FsNodeDTO> {
  return createFsNode(docsFolderId, name, "file", "doc", `# ${name.replace(/\.md$/, "")}\n\n`);
}
