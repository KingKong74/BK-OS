// WebDAV helpers shared between the Pages Router endpoint and any callers.
// Auth is now handled inline in the Pages Router handler.

// ─── Path parsing ──────────────────────────────────────────

/**
 * Parse a WebDAV URL path into BK-OS file system segments.
 * Example: "/api/webdav/C:/Users/Bailey/Documents/" → ["C:", "Users", "Bailey", "Documents"]
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
 */
export function davHref(segments: string[], isDir: boolean): string {
  const encoded = segments.map((s) => encodeURIComponent(s)).join("/");
  const path = encoded ? `/api/webdav/${encoded}` : "/api/webdav";
  return isDir ? `${path}/` : path;
}

export interface DavResource {
  segments: string[];
  name: string;
  isDir: boolean;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
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

/** Map a BK-OS file kind / filename to a MIME content type guess. */
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

/** Infer the BK-OS file kind from a filename. */
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
