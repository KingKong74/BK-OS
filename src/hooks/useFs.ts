"use client";

import { useCallback, useEffect, useState } from "react";

export interface FsNodeDTO {
  id: string;
  parentId: string | null;
  name: string;
  type: "file" | "folder";
  kind: string;
  textContent: string | null;
  blobRef: string | null;
  sizeBytes: number;
  properties: unknown;
  isSystem: boolean;
  recycled: boolean;
  recycledAt: string | null;
  recycledFromParentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * useFsChildren — list a folder's children. Falls back to root when parentId
 * is null. Re-fetches when path changes or after a mutation hint.
 */
export function useFsChildren(parentId: string | null | undefined) {
  const [children, setChildren] = useState<FsNodeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (parentId === undefined) return; // not ready yet
    let alive = true;
    setLoading(true);
    setError(null);
    const url = parentId === null ? '/api/fs/list?parentId=root' : `/api/fs/list?parentId=${parentId}`;
    fetch(url)
      .then(async (r) => {
        const data = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(data?.error || 'list failed');
        setChildren(data.children || []);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'fetch failed');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [parentId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { children, loading, error, refresh };
}

/** Resolve a path of name segments to a folder node id */
export async function resolvePath(segs: string[]): Promise<{ id: string | null }> {
  if (segs.length === 0) return { id: null };
  const res = await fetch(`/api/fs/list?path=${encodeURIComponent(segs.join('/'))}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'resolve failed');
  return { id: data.parentId };
}

export async function createFsNode(
  parentId: string | null,
  name: string,
  type: 'file' | 'folder',
  kind: string = 'other',
  textContent?: string
): Promise<FsNodeDTO> {
  const res = await fetch('/api/fs/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId, name, type, kind, textContent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'create failed');
  return data.node;
}

export async function renameFsNode(id: string, name: string): Promise<FsNodeDTO> {
  const res = await fetch(`/api/fs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'rename failed');
  return data.node;
}

export async function moveFsNode(id: string, parentId: string | null): Promise<FsNodeDTO> {
  const res = await fetch(`/api/fs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'move failed');
  return data.node;
}

export async function updateFsText(id: string, textContent: string): Promise<FsNodeDTO> {
  const res = await fetch(`/api/fs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textContent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'update failed');
  return data.node;
}

export async function deleteFsNode(id: string): Promise<void> {
  const res = await fetch(`/api/fs/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'delete failed');
  }
}

export async function restoreFsNode(id: string): Promise<FsNodeDTO> {
  const res = await fetch(`/api/fs/${id}/restore`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'restore failed');
  return data.node;
}

export async function permaDeleteFsNode(id: string): Promise<void> {
  const res = await fetch(`/api/fs/${id}/restore`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'perma delete failed');
  }
}

export async function listRecycled(): Promise<FsNodeDTO[]> {
  const res = await fetch('/api/fs/list?recycled=true');
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'list recycled failed');
  return data.children;
}

export async function searchAll(q: string): Promise<{
  files: Array<{ id: string; name: string; type: string; kind: string; parentId: string | null }>;
  notes: Array<{ id: string; title: string | null; preview: string }>;
}> {
  if (!q.trim()) return { files: [], notes: [] };
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'search failed');
  return data;
}

// ─── Format helpers ────────────────────────────────────────

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

export function kindLabel(node: { type: string; kind: string }): string {
  if (node.type === "folder") return "Folder";
  switch (node.kind) {
    case 'app': return 'Application';
    case 'image': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'pdf': return 'PDF Document';
    case 'doc': return 'Text Document';
    case 'code': return 'Source File';
    case 'sheet': return 'Spreadsheet';
    case 'config': return 'Config File';
    case 'binary': return 'Binary File';
    default: return 'File';
  }
}

/** Pretty Windows-style path from segments. ["C:", "Users", "Bailey"] → C:\Users\Bailey */
export function formatPath(segs: string[]): string {
  if (segs.length === 0) return 'My Computer';
  if (/^[A-Z]:$/.test(segs[0])) {
    if (segs.length === 1) return `${segs[0]}\\`;
    return `${segs[0]}\\${segs.slice(1).join('\\')}`;
  }
  return segs.join('\\');
}
