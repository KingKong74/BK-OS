import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildPropfindXml,
  kindForName,
  mimeForKind,
  parseDavPath,
  type DavResource,
} from "@/lib/webdav";
import {
  createNode,
  deleteBlob,
  getNode,
  listChildren,
  moveNode,
  readBlob,
  recycleNode,
  renameNode,
  resolvePath,
  seedFileSystemForUser,
  writeBlob,
} from "@/lib/fs-server";
import { db, fsNodes, users } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Disable body parsing — we read the raw stream for PUT operations
export const config = {
  api: {
    bodyParser: false,
  },
};

interface AuthedUser { id: string; email: string }

// ─── Basic Auth ────────────────────────────────────────────

async function authBasic(req: NextApiRequest): Promise<AuthedUser | null> {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string" || !header.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf-8");
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  const email = decoded.slice(0, idx);
  const password = decoded.slice(idx + 1);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !user.passwordHash || !user.email) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email };
}

function unauthorized(res: NextApiResponse) {
  res.setHeader("WWW-Authenticate", 'Basic realm="BK-OS WebDAV"');
  res.status(401).send("Unauthorized");
}

// Read raw body as a Buffer (since bodyParser is disabled)
function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(new Uint8Array(chunk)));
    req.on("end", () => {
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
      }
      resolve(Buffer.from(out));
    });
    req.on("error", reject);
  });
}

// ─── Main dispatcher ───────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = (req.method || "GET").toUpperCase();

  // OPTIONS doesn't need auth — file managers use it for capability discovery
  if (method === "OPTIONS") {
    res.setHeader("DAV", "1, 2");
    res.setHeader("MS-Author-Via", "DAV");
    res.setHeader("Allow", "OPTIONS, GET, HEAD, PROPFIND, PUT, DELETE, MKCOL, MOVE, COPY, LOCK, UNLOCK, PROPPATCH");
    res.setHeader("Content-Length", "0");
    res.status(200).end();
    return;
  }

  // Everything else needs auth
  const user = await authBasic(req);
  if (!user) return unauthorized(res);

  await seedFileSystemForUser(user.id);

  // Parse path from req.query
  const rawPath = req.query.path;
  const pathArray = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const segs = parseDavPath(pathArray);

  try {
    switch (method) {
      case "GET":
      case "HEAD":
        return await handleGet(req, res, user, segs, method === "HEAD");
      case "PUT":
        return await handlePut(req, res, user, segs);
      case "DELETE":
        return await handleDelete(req, res, user, segs);
      case "MKCOL":
        return await handleMkcol(req, res, user, segs);
      case "MOVE":
        return await handleMove(req, res, user, segs);
      case "COPY":
        res.status(501).send("COPY not yet supported");
        return;
      case "PROPFIND":
        return await handlePropfind(req, res, user, segs);
      case "PROPPATCH":
        // Accept silently — we don't store custom props
        res.setHeader("Content-Type", 'application/xml; charset="utf-8"');
        res.status(207).end();
        return;
      case "LOCK":
        return handleLock(req, res);
      case "UNLOCK":
        res.status(204).end();
        return;
      default:
        res.setHeader("Allow", "OPTIONS, GET, HEAD, PROPFIND, PUT, DELETE, MKCOL, MOVE, LOCK, UNLOCK, PROPPATCH");
        res.status(405).send(`Method ${method} not allowed`);
        return;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("WebDAV error:", e);
    res.status(500).send(e instanceof Error ? e.message : "internal error");
  }
}

// ─── GET / HEAD ────────────────────────────────────────────

async function handleGet(
  _req: NextApiRequest,
  res: NextApiResponse,
  user: AuthedUser,
  segs: string[],
  isHead: boolean
) {
  if (segs.length === 0) {
    const children = await listChildren(user.id, null);
    const names = children.map((c) => c.name).join("\n");
    const body = `BK-OS WebDAV root\n\n${names}\n`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200);
    if (isHead) return res.end();
    return res.send(body);
  }

  const resolved = await resolvePath(user.id, segs);
  if (!resolved?.id || !resolved.node) {
    res.status(404).send("Not Found");
    return;
  }

  const node = resolved.node;
  if (node.type === "folder") {
    const children = await listChildren(user.id, node.id);
    const names = children.map((c) => (c.type === "folder" ? `${c.name}/` : c.name)).join("\n");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200);
    if (isHead) return res.end();
    return res.send(names + "\n");
  }

  // File
  res.setHeader("Content-Type", mimeForKind(node.kind, node.name));
  res.setHeader("Last-Modified", new Date(node.updatedAt).toUTCString());

  if (node.textContent !== null && node.textContent !== undefined) {
    const buf = Buffer.from(node.textContent, "utf-8");
    res.setHeader("Content-Length", String(buf.length));
    res.status(200);
    if (isHead) return res.end();
    return res.end(buf);
  }
  if (node.blobRef) {
    const buf = await readBlob(node.blobRef);
    res.setHeader("Content-Length", String(buf.length));
    res.status(200);
    if (isHead) return res.end();
    return res.end(buf);
  }
  // Empty file
  res.setHeader("Content-Length", "0");
  res.status(200).end();
}

// ─── PUT ───────────────────────────────────────────────────

async function handlePut(req: NextApiRequest, res: NextApiResponse, user: AuthedUser, segs: string[]) {
  if (segs.length === 0) {
    res.status(405).send("Cannot PUT root");
    return;
  }

  const parentSegs = segs.slice(0, -1);
  const name = segs[segs.length - 1];

  let parentId: string | null = null;
  if (parentSegs.length > 0) {
    const resolvedParent = await resolvePath(user.id, parentSegs);
    if (!resolvedParent?.id) {
      res.status(409).send("Parent folder not found");
      return;
    }
    parentId = resolvedParent.id;
  }

  const buf = await readRawBody(req);
  const contentType = (req.headers["content-type"] as string) || "";
  const isText = /^text\//.test(contentType) ||
                 /^application\/(json|javascript|xml|x-yaml)/.test(contentType) ||
                 /\.(txt|md|json|js|ts|jsx|tsx|html|css|yaml|yml|toml|csv|log|env)$/i.test(name);

  const cond = parentId === null
    ? isNull(fsNodes.parentId)
    : eq(fsNodes.parentId, parentId);
  const existingArr = await db
    .select()
    .from(fsNodes)
    .where(and(eq(fsNodes.userId, user.id), eq(fsNodes.name, name), cond, eq(fsNodes.recycled, false)))
    .limit(1);
  const existing = existingArr[0];

  if (existing && existing.type === "folder") {
    res.status(409).send("Cannot overwrite folder with file");
    return;
  }

  const kind = kindForName(name);
  if (existing) {
    if (isText) {
      const text = buf.toString("utf-8");
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
    res.status(204).end();
    return;
  } else {
    try {
      if (isText) {
        await createNode(user.id, parentId, name, "file", kind, { textContent: buf.toString("utf-8") });
      } else {
        const { blobRef, size } = await writeBlob(buf);
        await createNode(user.id, parentId, name, "file", kind, { blobRef, sizeBytes: size });
      }
      res.status(201).end();
      return;
    } catch (e) {
      res.status(409).send(e instanceof Error ? e.message : "create failed");
      return;
    }
  }
}

// ─── DELETE ────────────────────────────────────────────────

async function handleDelete(_req: NextApiRequest, res: NextApiResponse, user: AuthedUser, segs: string[]) {
  if (segs.length === 0) {
    res.status(405).send("Cannot delete root");
    return;
  }
  const resolved = await resolvePath(user.id, segs);
  if (!resolved?.id) {
    res.status(404).send("Not Found");
    return;
  }
  try {
    await recycleNode(user.id, resolved.id);
    res.status(204).end();
  } catch (e) {
    res.status(409).send(e instanceof Error ? e.message : "delete failed");
  }
}

// ─── MKCOL ─────────────────────────────────────────────────

async function handleMkcol(_req: NextApiRequest, res: NextApiResponse, user: AuthedUser, segs: string[]) {
  if (segs.length === 0) {
    res.status(405).send("Bad target");
    return;
  }
  const parentSegs = segs.slice(0, -1);
  const name = segs[segs.length - 1];

  let parentId: string | null = null;
  if (parentSegs.length > 0) {
    const resolvedParent = await resolvePath(user.id, parentSegs);
    if (!resolvedParent?.id) {
      res.status(409).send("Parent folder not found");
      return;
    }
    parentId = resolvedParent.id;
  }

  try {
    await createNode(user.id, parentId, name, "folder");
    res.status(201).end();
  } catch (e) {
    res.status(409).send(e instanceof Error ? e.message : "mkcol failed");
  }
}

// ─── MOVE ──────────────────────────────────────────────────

async function handleMove(req: NextApiRequest, res: NextApiResponse, user: AuthedUser, segs: string[]) {
  if (segs.length === 0) {
    res.status(405).send("Cannot move root");
    return;
  }

  const destination = req.headers["destination"] as string | undefined;
  if (!destination) {
    res.status(400).send("Destination header required");
    return;
  }

  let destPath: string;
  try {
    const url = new URL(destination);
    destPath = url.pathname;
  } catch {
    destPath = destination;
  }
  const prefix = "/api/webdav/";
  if (!destPath.startsWith(prefix) && destPath !== "/api/webdav") {
    res.status(400).send("Destination outside WebDAV root");
    return;
  }
  const destStr = destPath === "/api/webdav" ? "" : destPath.slice(prefix.length);
  const destSegs = parseDavPath(destStr.split("/"));

  if (destSegs.length === 0) {
    res.status(400).send("Bad destination");
    return;
  }

  const srcResolved = await resolvePath(user.id, segs);
  if (!srcResolved?.id) {
    res.status(404).send("Source not found");
    return;
  }

  const destParentSegs = destSegs.slice(0, -1);
  const destName = destSegs[destSegs.length - 1];

  let destParentId: string | null = null;
  if (destParentSegs.length > 0) {
    const resolvedParent = await resolvePath(user.id, destParentSegs);
    if (!resolvedParent?.id) {
      res.status(409).send("Destination parent not found");
      return;
    }
    destParentId = resolvedParent.id;
  }

  try {
    const node = await getNode(user.id, srcResolved.id);
    if (!node) {
      res.status(404).send("Not Found");
      return;
    }
    if (node.parentId !== destParentId) {
      await moveNode(user.id, srcResolved.id, destParentId);
    }
    if (node.name !== destName) {
      await renameNode(user.id, srcResolved.id, destName);
    }
    res.status(204).end();
  } catch (e) {
    res.status(409).send(e instanceof Error ? e.message : "move failed");
  }
}

// ─── PROPFIND ──────────────────────────────────────────────

async function handlePropfind(req: NextApiRequest, res: NextApiResponse, user: AuthedUser, segs: string[]) {
  const depth = (req.headers["depth"] as string) ?? "1";

  let targetId: string | null = null;
  let isRoot = false;
  if (segs.length === 0) {
    isRoot = true;
  } else {
    const resolved = await resolvePath(user.id, segs);
    if (!resolved?.id || !resolved.node) {
      res.status(404).send("Not Found");
      return;
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
    if (!self) {
      res.status(404).send("Not Found");
      return;
    }
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

  // Children
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
  res.setHeader("Content-Type", 'application/xml; charset="utf-8"');
  res.setHeader("DAV", "1, 2");
  res.status(207).send(xml);
}

// ─── LOCK (faked) ──────────────────────────────────────────

function handleLock(_req: NextApiRequest, res: NextApiResponse) {
  const token = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? (crypto as { randomUUID: () => string }).randomUUID()
    : Math.random().toString(36).slice(2);
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>infinity</D:depth>
      <D:timeout>Second-3600</D:timeout>
      <D:locktoken>
        <D:href>opaquelocktoken:${token}</D:href>
      </D:locktoken>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`;
  res.setHeader("Content-Type", 'application/xml; charset="utf-8"');
  res.status(200).send(xml);
}
