/**
 * BK-OS instance mode. Set the BKOS_MODE env var on the deployment:
 *   BKOS_MODE=public   — demo instance, anyone can sign up, sandboxed data
 *   BKOS_MODE=private  — Bailey's real instance, full app set (default)
 *
 * Read this at request time on the server, or via NEXT_PUBLIC_BKOS_MODE on
 * the client (we mirror it).
 */

export type BkosMode = "public" | "private";

export function getServerMode(): BkosMode {
  const v = (process.env.BKOS_MODE || "private").toLowerCase();
  return v === "public" ? "public" : "private";
}

export function getClientMode(): BkosMode {
  if (typeof window === "undefined") return getServerMode();
  const v = (process.env.NEXT_PUBLIC_BKOS_MODE || "private").toLowerCase();
  return v === "public" ? "public" : "private";
}
