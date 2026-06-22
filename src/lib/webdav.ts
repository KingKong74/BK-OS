import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ─── Basic Auth ─────────────────────────────────────────────

export interface WebDAVUser {
  id: string;
  email: string;
}

/**
 * Authenticate a request via HTTP Basic. Returns user info or null.
 * The 401 response below should be returned by callers if this returns null.
 */
export async function authBasic(req: NextRequest): Promise<WebDAVUser | null> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
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
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email! };
}

export function unauthorizedResponse(): NextResponse {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="BK-OS WebDAV"',
      "Content-Type": "text/plain",
    },
  });
}

// ─── Path parsing ──────────────────────────────────────────

/**
 * Parse a WebDAV URL path into BK-OS file system segments.
 * Example: "/api/webdav/C:/Users/Bailey/Documents/" → ["C:", "Users", "Bailey", "Documents"]
 *
 * The trailing slash is significant in WebDAV (folders) but we don't preserve it
 * in segments — callers should check node.type to decide.
 */
export function parseDavPath(segments: string[]): string[] {
  return segments
    .map((s) => decodeURIComponent(s))
    .filter((s) => s.length > 0);
}

// ─── XML helpers ───────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a "href" path safely encoded for WebDAV XML responses.
 * Always uses forward slashes and percent-encodes each segment.
 */
export function davHref(segments: string[], isDir: boolean): string {
  const encoded = segments.map((s) => encodeURIComponent(s)).join("/");
  const path = encoded ? `/api/webdav/${encoded}` : "/api/webdav";
  return isDir ? `${path}/` : path;
}

export interface DavResource {
  segments: string[];        // path segments from root (excluding "/api/webdav")
  name: string;              // last segment, or "" for root
  isDir: boolean;
  sizeBytes: number;
  createdAt: string;         // ISO
  updatedAt: string;         // ISO
  contentType?: string;
}

function formatHttpDate(iso: string): string {
  try {
    return new Date(iso).toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

/**
 * Build a multistatus XML body for a PROPFIND response.
 * Each resource entry contains the standard "live" props that file managers expect.
 */
export function buildPropfindXml(resources: DavResource[]): string {
  const responses = resources.map((r) => {
    const href = davHref(r.segments, r.isDir);
    const lastModified = formatHttpDate(r.updatedAt);
    const created = new Date(r.createdAt).toISOString();
    const resourcetype = r.isDir ? "<D:collection/>" : "";
    const contentLength = r.isDir ? "" : `<D:getcontentlength>${r.sizeBytes}</D:getcontentlength>`;
    const contentType = r.isDir
      ? "<D:getcontenttype>httpd/unix-directory</D:getcontenttype>"
      : `<D:getcontenttype>${xmlEscape(r.contentType || "application/octet-stream")}</D:getcontenttype>`;

    return `
  <D:response>
    <D:href>${href}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${xmlEscape(r.name)}</D:displayname>
        <D:resourcetype>${resourcetype}</D:resourcetype>
        ${contentLength}
        ${contentType}
        <D:getlastmodified>${lastModified}</D:getlastmodified>
        <D:creationdate>${created}</D:creationdate>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
  }).join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">${responses}
</D:multistatus>`;
}

export function multistatusResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 207,
    headers: {
      "Content-Type": 'application/xml; charset="utf-8"',
      "DAV": "1, 2",
    },
  });
}

/**
 * Map a BK-OS file kind to a MIME content type guess.
 */
export function mimeForKind(kind: string, name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (lower.endsWith(".ts")) return "application/typescript; charset=utf-8";

  switch (kind) {
    case "image": return "image/*";
    case "video": return "video/*";
    case "audio": return "audio/*";
    case "pdf": return "application/pdf";
    case "doc":
    case "code":
    case "config": return "text/plain; charset=utf-8";
    default: return "application/octet-stream";
  }
}

/**
 * Infer the BK-OS file kind from a filename.
 */
export function kindForName(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(md|txt|log)$/i.test(lower)) return "doc";
  if (/\.(json|yaml|yml|toml|ini|env)$/i.test(lower)) return "config";
  if (/\.(js|ts|jsx|tsx|py|rb|go|rs|c|cpp|java|sh|bash)$/i.test(lower)) return "code";
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(lower)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lower)) return "video";
  if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(lower)) return "audio";
  if (/\.pdf$/i.test(lower)) return "pdf";
  return "other";
}
