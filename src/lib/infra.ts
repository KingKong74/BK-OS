import { db } from "@/db";
import { sql } from "drizzle-orm";

export type StatusLevel = "ok" | "warn" | "fail" | "unknown";

export interface Check {
  id: string;
  label: string;
  level: StatusLevel;
  detail: string;
  meta?: Record<string, string | number>;
  hint?: string; // human-friendly suggested fix when level !== "ok"
}

// ─── Individual checks ─────────────────────────────────────

async function checkDatabase(): Promise<Check> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const ms = Date.now() - start;
    if (ms > 500) {
      return {
        id: "db",
        label: "Postgres",
        level: "warn",
        detail: `Reachable but slow (${ms}ms)`,
        meta: { roundTripMs: ms },
        hint: "Latency > 500ms is unusual on a local network — check Postgres CPU/disk on the host",
      };
    }
    return {
      id: "db",
      label: "Postgres",
      level: "ok",
      detail: `Reachable (${ms}ms)`,
      meta: { roundTripMs: ms },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    let hint = "Check DATABASE_URL env var and that the postgres container is running";
    if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN")) {
      hint = "DNS resolution failed — the database hostname can't be resolved. If using Docker Swarm, use the service name (not the task name with .1.<uuid> suffix). Check /etc/docker/daemon.json for DNS settings.";
    } else if (msg.includes("ECONNREFUSED")) {
      hint = "Connection refused — the postgres service may be down or unreachable on the configured port";
    } else if (msg.includes("password authentication failed")) {
      hint = "Wrong password — check DATABASE_URL credentials match the POSTGRES_PASSWORD env var on the postgres service";
    } else if (msg.includes("does not exist")) {
      hint = "The database doesn't exist — check the database name in DATABASE_URL or run the migration";
    }
    return {
      id: "db",
      label: "Postgres",
      level: "fail",
      detail: msg.slice(0, 200),
      hint,
    };
  }
}

async function checkFsSchema(): Promise<Check> {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM fs_nodes`);
    const rows = result.rows as unknown as { count: string | number }[];
    const count = Number(rows[0]?.count ?? 0);
    return {
      id: "fs-schema",
      label: "File system",
      level: "ok",
      detail: `${count} nodes`,
      meta: { totalNodes: count },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return {
      id: "fs-schema",
      label: "File system",
      level: "fail",
      detail: msg.slice(0, 200),
      hint: "The fs_nodes table is missing. Run sql/phase1-bkos.sql against the database.",
    };
  }
}

async function checkBlobStorage(): Promise<Check> {
  const blobDir = process.env.BKOS_BLOB_DIR || "/data/blobs";
  try {
    const { promises: fs } = await import("node:fs");
    await fs.access(blobDir);
    const stats = await fs.stat(blobDir);
    if (!stats.isDirectory()) {
      return {
        id: "blobs",
        label: "Blob storage",
        level: "warn",
        detail: `${blobDir} exists but isn't a directory`,
        hint: "Remove the file and create a directory at that path",
      };
    }
    return {
      id: "blobs",
      label: "Blob storage",
      level: "ok",
      detail: `${blobDir} accessible`,
      meta: { path: blobDir },
    };
  } catch {
    return {
      id: "blobs",
      label: "Blob storage",
      level: "warn",
      detail: `${blobDir} not accessible`,
      hint: "Binary file uploads will fail. Create the directory and mount it as a Docker volume.",
    };
  }
}

function checkEnvVars(): Check {
  const required = ["DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return {
      id: "env",
      label: "Env vars",
      level: "fail",
      detail: `Missing: ${missing.join(", ")}`,
      hint: "Set the missing env vars in Dokploy → bailey-os service → Environment tab",
    };
  }
  return {
    id: "env",
    label: "Env vars",
    level: "ok",
    detail: `All ${required.length} required vars present`,
    meta: {
      BKOS_MODE: process.env.BKOS_MODE || "private (default)",
      NODE_ENV: process.env.NODE_ENV || "unknown",
    },
  };
}

function checkGitHubReachable(): Promise<Check> {
  // Skip in test/CI; otherwise hit api.github.com to verify DNS + connectivity
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 3000);
    fetch("https://api.github.com/zen", { signal: ctrl.signal, headers: { "User-Agent": "bk-os-infra-check" } })
      .then(async (r) => {
        clearTimeout(timeoutId);
        if (r.ok) {
          resolve({
            id: "github",
            label: "GitHub API",
            level: "ok",
            detail: `Reachable (HTTP ${r.status})`,
          });
        } else {
          resolve({
            id: "github",
            label: "GitHub API",
            level: "warn",
            detail: `HTTP ${r.status}`,
            hint: "GitHub API is reachable but returned non-200. May be rate-limited.",
          });
        }
      })
      .catch((e: unknown) => {
        clearTimeout(timeoutId);
        const msg = e instanceof Error ? e.message : "unknown";
        let hint = "GitHub auto-deploy webhooks won't work until this is fixed";
        if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN")) {
          hint = "DNS failure — set /etc/docker/daemon.json with reliable DNS servers (1.1.1.1, 8.8.8.8) and restart docker";
        }
        resolve({
          id: "github",
          label: "GitHub API",
          level: "fail",
          detail: msg.slice(0, 200),
          hint,
        });
      });
  });
}

// ─── Aggregator ────────────────────────────────────────────

export async function gatherStatus(): Promise<Check[]> {
  const results = await Promise.allSettled([
    checkDatabase(),
    checkFsSchema(),
    checkBlobStorage(),
    Promise.resolve(checkEnvVars()),
    checkGitHubReachable(),
  ]);

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      id: `check-${i}`,
      label: `Check ${i}`,
      level: "unknown" as const,
      detail: r.reason instanceof Error ? r.reason.message : "Check threw",
    };
  });
}

export function overallLevel(checks: Check[]): StatusLevel {
  if (checks.some((c) => c.level === "fail")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  if (checks.every((c) => c.level === "ok")) return "ok";
  return "unknown";
}
