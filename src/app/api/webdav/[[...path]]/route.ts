import { NextRequest, NextResponse } from "next/server";
import {
  authBasic,
  buildPropfindXml,
  kindForName,
  mimeForKind,
  multistatusResponse,
  parseDavPath,
  unauthorizedResponse,
  type DavResource,
} from "@/lib/webdav";
import {
  createNode,
  deleteBlob,
  getNode,
  listChildren,
  moveNode,
  permaDelete,
  readBlob,
  recycleNode,
  resolvePath,
  seedFileSystemForUser,
  updateTextContent,
  writeBlob,
} from "@/lib/fs-server";
import { db, fsNodes } from "@/db";
import { and, eq } from "drizzle-orm";

interface Ctx { params: Promise<{ path?: string[] }> }

// ─── OPTIONS — capability discovery ────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "DAV": "1, 2",
      "MS-Author-Via": "DAV",
      "Allow": "OPTIONS, GET, HEAD, PROPFIND, PUT, DELETE, MKCOL, MOVE, COPY",
      "Content-Length": "0",
    },
  });
}

// ─── GET — read file ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await authBasic(req);
  if (!user) return unauthorizedResponse();
  await seedFileSystemForUser(user.id);

  const { path = [] } = await params;
  const segs = parseDavPath(path);

  // If no path → root listing as text (browser convenience)
  if (segs.length === 0) {
    const children = await listChildren(user.id, null);
    const names = children.map((c) => c.name).join("\n");
    return new NextResponse(`BK-OS WebDAV root\n\n${names}\n`, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const resolved = await resolvePath(user.id, segs);
  if (!resolved?.id || !resolved.node) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const node = resolved.node;
  if (node.type === "folder") {
    // GET on a folder → simple text listing (most clients won't do this; they use PROPFIND)
    const children = await listChildren(user.id, node.id);
    const names = children.map((c) => (c.type === "folder" ? `${c.name}/` : c.name)).join("\n");
    return new NextResponse(names + "\n", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // File — text first, then blob
  if (node.textContent !== null && node.textContent !== undefined) {
    return new NextResponse(node.textContent, {
      status: 200,
      headers: {
        "Content-Type": mimeForKind(node.kind, node.name),
        "Content-Length": String(Buffer.byteLength(node.textContent, "utf-8")),
        "Last-Modified": new Date(node.updatedAt).toUTCString(),
      },
    });
  }
  if (node.blobRef) {
    const buf = await readBlob(node.blobRef);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": mimeForKind(node.kind, node.name),
        "Content-Length": String(buf.length),
        "Last-Modified": new Date(node.updatedAt).toUTCString(),
      },
    });
  }
  // Empty file
  return new NextResponse("", {
    status: 200,
    headers: {
      "Content-Type": mimeForKind(node.kind, node.name),
      "Content-Length": "0",
    },
  });
}

export async function HEAD(req: NextRequest, { params }: Ctx) {
  // Same logic as GET but no body
  const res = await GET(req, { params });
  return new NextResponse(null, { status: res.status, headers: res.headers });
}

// ─── PUT — write file ──────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await authBasic(req);
  if (!user) return unauthorizedResponse();
  await seedFileSystemForUser(user.id);

  const { path = [] } = await params;
  const segs = parseDavPath(path);
  if (segs.length === 0) return new NextResponse("Cannot PUT root", { status: 405 });

  const parentSegs = segs.slice(0, -1);
  const name = segs[segs.length - 1];

  // Resolve parent
  let parentId: string | null = null;
  if (parentSegs.length > 0) {
    const resolvedParent = await resolvePath(user.id, parentSegs);
    if (!resolvedParent?.id) return new NextResponse("Parent folder not found", { status: 409 });
    parentId = resolvedParent.id;
  }

  // Read body
  const ab = await req.arrayBuffer();
  const buf = Buffer.from(ab);
  const contentType = req.headers.get("content-type") || "";
  const isText = /^text\//.test(contentType) ||
                 /^application\/(json|javascript|xml|x-yaml)/.test(contentType) ||
                 /\.(txt|md|json|js|ts|jsx|tsx|html|css|yaml|yml|toml|csv|log|env)$/i.test(name);

  // Check if a node already exists with this name in the parent
  const cond = parentId === null
    ? (await import("drizzle-orm")).isNull(fsNodes.parentId)
    : eq(fsNodes.parentId, parentId);
  const existingArr = await db
    .select()
    .from(fsNodes)
    .where(and(eq(fsNodes.userId, user.id), eq(fsNodes.name, name), cond, eq(fsNodes.recycled, false)))
    .limit(1);
  const existing = existingArr[0];

  if (existing && existing.type === "folder") {
    return new NextResponse("Cannot overwrite folder with file", { status: 409 });
  }

  const kind = kindForName(name);
  if (existing) {
    // Overwrite
    if (isText) {
      const text = buf.toString("utf-8");
      // If old node had a blob, delete it
      if (existing.blobRef) await deleteBlob(existing.blobRef);
      await db
        .update(fsNodes)
        .set({
          textContent: text,
          blobRef: null,
          sizeBytes: text.length,
          kind,
          updatedAt: new Date(),
        })
        .where(and(eq(fsNodes.id, existing.id), eq(fsNodes.userId, user.id)));
    } else {
      if (existing.blobRef) await deleteBlob(existing.blobRef);
      const { blobRef, size } = await writeBlob(buf);
      await db
        .update(fsNodes)
        .set({
          textContent: null,
          blobRef,
          sizeBytes: size,
          kind,
          updatedAt: new Date(),
        })
        .where(and(eq(fsNodes.id, existing.id), eq(fsNodes.userId, user.id)));
    }
    return new NextResponse(null, { status: 204 });
  } else {
    // Create
    try {
      if (isText) {
        await createNode(user.id, parentId, name, "file", kind, { textContent: buf.toString("utf-8") });
      } else {
        const { blobRef, size } = await writeBlob(buf);
        await createNode(user.id, parentId, name, "file", kind, { blobRef, sizeBytes: size });
      }
      return new NextResponse(null, { status: 201 });
    } catch (e) {
      return new NextResponse(e instanceof Error ? e.message : "create failed", { status: 409 });
    }
  }
}

// ─── DELETE — soft-delete via recycle ──────────────────────

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await authBasic(req);
  if (!user) return unauthorizedResponse();
  await seedFileSystemForUser(user.id);

  const { path = [] } = await params;
  const segs = parseDavPath(path);
  if (segs.length === 0) return new NextResponse("Cannot delete root", { status: 405 });

  const resolved = await resolvePath(user.id, segs);
  if (!resolved?.id) return new NextResponse("Not Found", { status: 404 });

  try {
    await recycleNode(user.id, resolved.id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "delete failed", { status: 409 });
  }
}

// ─── MKCOL — make folder ───────────────────────────────────

export async function MKCOL(req: NextRequest, { params }: Ctx) {
  const user = await authBasic(req);
  if (!user) return unauthorizedResponse();
  await seedFileSystemForUser(user.id);

  const { path = [] } = await params;
  const segs = parseDavPath(path);
  if (segs.length === 0) return new NextResponse("Bad target", { status: 405 });

  const parentSegs = segs.slice(0, -1);
  const name = segs[segs.length - 1];

  let parentId: string | null = null;
  if (parentSegs.length > 0) {
    const resolvedParent = await resolvePath(user.id, parentSegs);
    if (!resolvedParent?.id) return new NextResponse("Parent folder not found", { status: 409 });
    parentId = resolvedParent.id;
  }

  try {
    await createNode(user.id, parentId, name, "folder");
    return new NextResponse(null, { status: 201 });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "mkcol failed", { status: 409 });
  }
}

// ─── MOVE — rename or move ─────────────────────────────────

export async function MOVE(req: NextRequest, { params }: Ctx) {
  const user = await authBasic(req);
  if (!user) return unauthorizedResponse();
  await seedFileSystemForUser(user.id);

  const { path = [] } = await params;
  const srcSegs = parseDavPath(path);
  if (srcSegs.length === 0) return new NextResponse("Cannot move root", { status: 405 });

  const destination = req.headers.get("destination");
  if (!destination) return new NextResponse("Destination header required", { status: 400 });

  // Parse destination URL — strip /api/webdav prefix
  let destPath: string;
  try {
    const url = new URL(destination);
    destPath = url.pathname;
  } catch {
    destPath = destination;
  }
  const prefix = "/api/webdav/";
  if (!destPath.startsWith(prefix) && destPath !== "/api/webdav") {
    return new NextResponse("Destination outside WebDAV root", { status: 400 });
  }
  const destStr = destPath === "/api/webdav" ? "" : destPath.slice(prefix.length);
  const destSegs = parseDavPath(destStr.split("/"));

  if (destSegs.length === 0) return new NextResponse("Bad destination", { status: 400 });

  const srcResolved = await resolvePath(user.id, srcSegs);
  if (!srcResolved?.id) return new NextResponse("Source not found", { status: 404 });

  const destParentSegs = destSegs.slice(0, -1);
  const destName = destSegs[destSegs.length - 1];

  let destParentId: string | null = null;
  if (destParentSegs.length > 0) {
    const resolvedParent = await resolvePath(user.id, destParentSegs);
    if (!resolvedParent?.id) return new NextResponse("Destination parent not found", { status: 409 });
    destParentId = resolvedParent.id;
  }

  try {
    const node = await getNode(user.id, srcResolved.id);
    if (!node) return new NextResponse("Not Found", { status: 404 });
    // If parent changes, move
    if (node.parentId !== destParentId) {
      await moveNode(user.id, srcResolved.id, destParentId);
    }
    // If name changes, rename
    if (node.name !== destName) {
      const { renameNode } = await import("@/lib/fs-server");
      await renameNode(user.id, srcResolved.id, destName);
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "move failed", { status: 409 });
  }
}

// ─── PROPFIND — list directory / get properties ────────────

export async function PROPFIND(req: NextRequest, { params }: Ctx) {
  const user = await authBasic(req);
  if (!user) return unauthorizedResponse();
  await seedFileSystemForUser(user.id);

  const { path = [] } = await params;
  const segs = parseDavPath(path);
  const depth = req.headers.get("depth") ?? "1";

  // Resolve target
  let targetId: string | null = null;
  let isRoot = false;
  if (segs.length === 0) {
    isRoot = true;
  } else {
    const resolved = await resolvePath(user.id, segs);
    if (!resolved?.id || !resolved.node) {
      return new NextResponse("Not Found", { status: 404 });
    }
    targetId = resolved.id;
  }

  const resources: DavResource[] = [];

  // Self
  if (isRoot) {
    resources.push({
      segments: [],
      name: "",
      isDir: true,
      sizeBytes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    const self = await getNode(user.id, targetId!);
    if (!self) return new NextResponse("Not Found", { status: 404 });
    resources.push({
      segments: segs,
      name: self.name,
      isDir: self.type === "folder",
      sizeBytes: self.sizeBytes,
      createdAt: self.createdAt.toISOString(),
      updatedAt: self.updatedAt.toISOString(),
      contentType: mimeForKind(self.kind, self.name),
    });
  }

  // Children (only if depth=1 or infinity and target is a folder)
  if (depth !== "0") {
    const target = isRoot ? null : await getNode(user.id, targetId!);
    if (isRoot || (target && target.type === "folder")) {
      const children = await listChildren(user.id, isRoot ? null : targetId);
      for (const c of children) {
        resources.push({
          segments: [...segs, c.name],
          name: c.name,
          isDir: c.type === "folder",
          sizeBytes: c.sizeBytes,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          contentType: mimeForKind(c.kind, c.name),
        });
      }
    }
  }

  const xml = buildPropfindXml(resources);
  return multistatusResponse(xml);
}

// ─── COPY — defer to MOVE semantics for now ────────────────

export async function COPY(req: NextRequest, { params }: Ctx) {
  return new NextResponse("COPY not yet supported. Use MOVE for now.", { status: 501 });
}

// ─── LOCK / UNLOCK — fake-implement so Windows is happy ────

export async function LOCK() {
  // Pretend to lock; return a minimal lockdiscovery response
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>infinity</D:depth>
      <D:timeout>Second-3600</D:timeout>
      <D:locktoken>
        <D:href>opaquelocktoken:${crypto.randomUUID()}</D:href>
      </D:locktoken>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": 'application/xml; charset="utf-8"' },
  });
}

export async function UNLOCK() {
  return new NextResponse(null, { status: 204 });
}

// ─── PROPPATCH — accept silently (we don't store custom props) ──

export async function PROPPATCH() {
  return new NextResponse(null, { status: 207 });
}
