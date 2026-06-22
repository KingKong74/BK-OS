import { db, fsNodes } from '@/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BLOB_DIR = process.env.BKOS_BLOB_DIR || '/data/blobs';

// ─── Blob storage on disk ───────────────────────────────────

async function ensureBlobDir() {
  await fs.mkdir(BLOB_DIR, { recursive: true });
}

export async function writeBlob(buf: Buffer): Promise<{ blobRef: string; size: number }> {
  await ensureBlobDir();
  const hash = crypto.randomUUID();
  const blobRef = hash;
  await fs.writeFile(path.join(BLOB_DIR, blobRef), new Uint8Array(buf));
  return { blobRef, size: buf.length };
}

export async function readBlob(blobRef: string): Promise<Buffer> {
  return fs.readFile(path.join(BLOB_DIR, blobRef));
}

export async function deleteBlob(blobRef: string): Promise<void> {
  try {
    await fs.unlink(path.join(BLOB_DIR, blobRef));
  } catch {
    // Already gone, fine
  }
}

// ─── Seed: default folder tree for a new user ──────────────

/**
 * Called the first time a user signs up. Creates the canonical folder
 * structure for BK-OS. All seeded folders are marked isSystem=true so they
 * can't be deleted (rename allowed, delete blocked).
 */
export async function seedFileSystemForUser(userId: string): Promise<void> {
  // Idempotency: if any node already exists for this user, skip seeding.
  const existing = await db
    .select({ id: fsNodes.id })
    .from(fsNodes)
    .where(eq(fsNodes.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  // Helper to insert and return id
  async function insert(
    parentId: string | null,
    name: string,
    type: 'file' | 'folder',
    kind = 'other',
    extras: { textContent?: string; isSystem?: boolean } = {}
  ): Promise<string> {
    const [row]: { id: string }[] = await db
      .insert(fsNodes)
      .values({
        userId,
        parentId,
        name,
        type,
        kind,
        textContent: extras.textContent ?? null,
        isSystem: extras.isSystem ?? true,
      })
      .returning({ id: fsNodes.id });
    return row.id;
  }

  // C: drive — top-level
  const cDrive = await insert(null, 'C:', 'folder');
  const users = await insert(cDrive, 'Users', 'folder');
  const bailey = await insert(users, 'Bailey', 'folder');

  // Desktop (intentionally empty — user populates via right-click)
  await insert(bailey, 'Desktop', 'folder');

  // Documents
  const documents = await insert(bailey, 'Documents', 'folder');
  await insert(documents, 'Financial', 'folder');
  await insert(documents, 'Tax', 'folder');
  await insert(documents, 'Personal', 'folder');

  // Pictures
  const pictures = await insert(bailey, 'Pictures', 'folder');
  await insert(pictures, '2025', 'folder');
  await insert(pictures, '2026', 'folder');

  // Downloads / Music / Videos — for Media Library later
  await insert(bailey, 'Downloads', 'folder');
  await insert(bailey, 'Music', 'folder');
  await insert(bailey, 'Videos', 'folder');

  // Projects — for the Projects app
  await insert(bailey, 'Projects', 'folder');

  // Welcome readme on the desktop
  await insert(
    await getDesktopId(userId),
    'Welcome.txt',
    'file',
    'doc',
    {
      textContent:
        "Welcome to BK-OS.\n\n" +
        "This is your personal computer in the browser. Everything you " +
        "create here is saved to your account. Right-click the desktop to " +
        "make folders, drop sticky notes, or pin apps.\n\n" +
        "Press Ctrl+K for the command palette to jump to anything fast.\n\n" +
        "Have a poke around.",
      isSystem: false,
    }
  );

  // Program Files (system, hidden-ish but reachable)
  const programFiles = await insert(cDrive, 'Program Files', 'folder');
  await insert(programFiles, 'Games', 'folder');
}

async function getDesktopId(userId: string): Promise<string> {
  // Walk the path C: / Users / Bailey / Desktop
  const segs = ['C:', 'Users', 'Bailey', 'Desktop'];
  let parentId: string | null = null;
  for (const seg of segs) {
    const parentCond = parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, parentId as string);
    const result: { id: string }[] = await db
      .select({ id: fsNodes.id })
      .from(fsNodes)
      .where(and(eq(fsNodes.userId, userId), eq(fsNodes.name, seg), parentCond))
      .limit(1);
    const found = result[0];
    if (!found) throw new Error(`Seed: failed to find ${seg}`);
    parentId = found.id;
  }
  if (!parentId) throw new Error('Seed: desktop id resolution failed');
  return parentId;
}

// ─── Operations ────────────────────────────────────────────

export async function listChildren(userId: string, parentId: string | null, includeRecycled = false) {
  const cond = parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, parentId);
  const rows = await db
    .select()
    .from(fsNodes)
    .where(
      and(
        eq(fsNodes.userId, userId),
        cond,
        includeRecycled ? sql`TRUE` : eq(fsNodes.recycled, false)
      )
    );
  return rows;
}

/**
 * Resolve a path (array of segment names from the root) to a node id.
 * `[]` resolves to "the user's root" — i.e. parentId = null with one child
 * "C:". This API matches the existing VFS path conventions.
 */
export async function resolvePath(userId: string, segs: string[]) {
  let parentId: string | null = null;
  let lastNode: typeof fsNodes.$inferSelect | null = null;
  for (const seg of segs) {
    const parentCond = parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, parentId as string);
    const result: (typeof fsNodes.$inferSelect)[] = await db
      .select()
      .from(fsNodes)
      .where(
        and(eq(fsNodes.userId, userId), eq(fsNodes.name, seg), parentCond, eq(fsNodes.recycled, false))
      )
      .limit(1);
    const row = result[0];
    if (!row) return null;
    parentId = row.id;
    lastNode = row;
  }
  return { id: parentId, node: lastNode };
}

export async function getNode(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(fsNodes)
    .where(and(eq(fsNodes.id, id), eq(fsNodes.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createNode(
  userId: string,
  parentId: string | null,
  name: string,
  type: 'file' | 'folder',
  kind: string = 'other',
  extras: { textContent?: string; blobRef?: string; sizeBytes?: number; properties?: unknown } = {}
) {
  // Disallow duplicate names in the same folder.
  const cond = parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, parentId);
  const [dup] = await db
    .select({ id: fsNodes.id })
    .from(fsNodes)
    .where(
      and(eq(fsNodes.userId, userId), cond, eq(fsNodes.name, name), eq(fsNodes.recycled, false))
    )
    .limit(1);
  if (dup) throw new Error(`A node named "${name}" already exists here`);

  const [row] = await db
    .insert(fsNodes)
    .values({
      userId,
      parentId,
      name,
      type,
      kind,
      textContent: extras.textContent ?? null,
      blobRef: extras.blobRef ?? null,
      sizeBytes: extras.sizeBytes ?? 0,
      properties: (extras.properties as object | null) ?? null,
    })
    .returning();
  return row;
}

export async function renameNode(userId: string, id: string, newName: string) {
  const node = await getNode(userId, id);
  if (!node) throw new Error('Node not found');
  if (node.name === newName) return node;

  // Dup check
  const cond = node.parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, node.parentId);
  const [dup] = await db
    .select({ id: fsNodes.id })
    .from(fsNodes)
    .where(
      and(eq(fsNodes.userId, userId), cond, eq(fsNodes.name, newName), eq(fsNodes.recycled, false))
    )
    .limit(1);
  if (dup) throw new Error(`A node named "${newName}" already exists here`);

  const [updated] = await db
    .update(fsNodes)
    .set({ name: newName, updatedAt: new Date() })
    .where(and(eq(fsNodes.id, id), eq(fsNodes.userId, userId)))
    .returning();
  return updated;
}

export async function moveNode(userId: string, id: string, newParentId: string | null) {
  const node = await getNode(userId, id);
  if (!node) throw new Error('Node not found');
  if (newParentId !== null) {
    const parent = await getNode(userId, newParentId);
    if (!parent || parent.type !== 'folder') throw new Error('Invalid destination');
  }
  // Prevent moving into self / descendant — simple guard: not same id, and parent isn't self.
  if (newParentId === id) throw new Error('Cannot move into self');
  const [updated] = await db
    .update(fsNodes)
    .set({ parentId: newParentId, updatedAt: new Date() })
    .where(and(eq(fsNodes.id, id), eq(fsNodes.userId, userId)))
    .returning();
  return updated;
}

export async function updateTextContent(userId: string, id: string, text: string) {
  const [updated] = await db
    .update(fsNodes)
    .set({ textContent: text, sizeBytes: text.length, updatedAt: new Date() })
    .where(and(eq(fsNodes.id, id), eq(fsNodes.userId, userId), eq(fsNodes.type, 'file')))
    .returning();
  return updated;
}

/** Soft-delete a node (and recursively its descendants) to the recycle bin. */
export async function recycleNode(userId: string, id: string) {
  const node = await getNode(userId, id);
  if (!node) throw new Error('Node not found');
  if (node.isSystem) throw new Error('System folders cannot be deleted');

  const now = new Date();
  const fromParent = node.parentId;

  // Collect all descendants
  const allIds = await collectDescendants(userId, id);
  allIds.add(id);

  // Recycle them all
  await db
    .update(fsNodes)
    .set({
      recycled: true,
      recycledAt: now,
      recycledFromParentId: fromParent,
      updatedAt: now,
    })
    .where(
      and(
        eq(fsNodes.userId, userId),
        sql`${fsNodes.id} = ANY(${Array.from(allIds)})`
      )
    );
}

async function collectDescendants(userId: string, parentId: string): Promise<Set<string>> {
  const collected = new Set<string>();
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await db
      .select({ id: fsNodes.id, type: fsNodes.type })
      .from(fsNodes)
      .where(and(eq(fsNodes.userId, userId), eq(fsNodes.parentId, current), eq(fsNodes.recycled, false)));
    for (const c of children) {
      collected.add(c.id);
      if (c.type === 'folder') queue.push(c.id);
    }
  }
  return collected;
}

/** Restore from recycle bin. */
export async function restoreNode(userId: string, id: string) {
  const node = await getNode(userId, id);
  if (!node) throw new Error('Node not found');
  if (!node.recycled) return node;

  // If original parent is gone (or also recycled), restore to desktop as fallback.
  let parentId = node.recycledFromParentId;
  if (parentId) {
    const parent = await getNode(userId, parentId);
    if (!parent || parent.recycled) parentId = null;
  }
  if (parentId === null) {
    const desktop = await resolvePath(userId, ['C:', 'Users', 'Bailey', 'Desktop']);
    parentId = desktop?.id ?? null;
  }

  const [updated] = await db
    .update(fsNodes)
    .set({
      recycled: false,
      recycledAt: null,
      recycledFromParentId: null,
      parentId,
      updatedAt: new Date(),
    })
    .where(and(eq(fsNodes.id, id), eq(fsNodes.userId, userId)))
    .returning();
  return updated;
}

/** Permanent delete (also blob cleanup). */
export async function permaDelete(userId: string, id: string) {
  const node = await getNode(userId, id);
  if (!node) return;
  if (node.isSystem) throw new Error('System nodes cannot be permanently deleted');

  // Collect descendants (recycled or not, both)
  const queue = [id];
  const toDelete: { id: string; blobRef: string | null }[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const [row] = await db
      .select()
      .from(fsNodes)
      .where(and(eq(fsNodes.userId, userId), eq(fsNodes.id, cur)))
      .limit(1);
    if (!row) continue;
    toDelete.push({ id: row.id, blobRef: row.blobRef });
    const children = await db
      .select({ id: fsNodes.id })
      .from(fsNodes)
      .where(and(eq(fsNodes.userId, userId), eq(fsNodes.parentId, row.id)));
    for (const c of children) queue.push(c.id);
  }

  // Delete blobs first
  for (const it of toDelete) {
    if (it.blobRef) await deleteBlob(it.blobRef);
  }

  // Delete rows (cascading by parent walk, simplest: by id list)
  if (toDelete.length > 0) {
    await db
      .delete(fsNodes)
      .where(
        and(
          eq(fsNodes.userId, userId),
          sql`${fsNodes.id} = ANY(${toDelete.map((d) => d.id)})`
        )
      );
  }
}

/** List all recycled nodes for a user */
export async function listRecycled(userId: string) {
  const rows = await db
    .select()
    .from(fsNodes)
    .where(and(eq(fsNodes.userId, userId), eq(fsNodes.recycled, true)));
  return rows;
}

/** Search file/folder names. Limited to top N matches, case-insensitive. */
export async function searchByName(userId: string, q: string, limit = 30) {
  if (!q.trim()) return [];
  const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
  const rows = await db
    .select()
    .from(fsNodes)
    .where(
      and(
        eq(fsNodes.userId, userId),
        eq(fsNodes.recycled, false),
        sql`LOWER(${fsNodes.name}) LIKE LOWER(${pattern})`
      )
    )
    .limit(limit);
  return rows;
}
