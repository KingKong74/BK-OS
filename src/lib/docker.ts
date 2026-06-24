import http from "node:http";

const DOCKER_SOCKET = process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";

// ─── Low-level socket HTTP ─────────────────────────────────

interface DockerHttpResponse {
  status: number;
  body: string;
}

function dockerHttp(method: string, path: string, body?: string): Promise<DockerHttpResponse> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(body));
    }
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path,
        method,
        headers,
        timeout: 5000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const data = Buffer.concat(chunks as unknown as Uint8Array[]).toString("utf-8");
          resolve({ status: res.statusCode || 0, body: data });
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.on("timeout", () => { req.destroy(new Error("Docker socket request timed out")); });
    if (body) req.write(body);
    req.end();
  });
}

function dockerHttpRaw(method: string, path: string): Promise<{ status: number; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path,
        method,
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const buf = Buffer.concat(chunks as unknown as Uint8Array[]);
          resolve({ status: res.statusCode || 0, buffer: buf });
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.on("timeout", () => { req.destroy(new Error("Docker socket request timed out")); });
    req.end();
  });
}

// ─── Type definitions for Docker API responses ─────────────

export interface ContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  State: string; // running, exited, paused, restarting, etc.
  Status: string; // "Up 2 hours", "Exited (0) 5 minutes ago"
  Created: number; // unix timestamp
  Ports: Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  Labels: Record<string, string>;
  NetworkSettings: { Networks: Record<string, { IPAddress: string }> };
}

export interface ContainerInspect {
  Id: string;
  Name: string;
  Image: string;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    OOMKilled: boolean;
    Dead: boolean;
    Pid: number;
    ExitCode: number;
    Error: string;
    StartedAt: string;
    FinishedAt: string;
  };
  Config: {
    Hostname: string;
    Env: string[];
    Image: string;
    Labels: Record<string, string>;
  };
  Created: string;
  RestartCount: number;
}

interface DockerStatsRaw {
  cpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage?: number;
    online_cpus?: number;
  };
  precpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage?: number;
  };
  memory_stats: {
    usage: number;
    limit: number;
    stats?: { cache?: number; inactive_file?: number };
  };
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>;
  blkio_stats?: {
    io_service_bytes_recursive?: Array<{ op: string; value: number }>;
  };
}

export interface ContainerStats {
  cpuPercent: number;
  memUsedBytes: number;
  memLimitBytes: number;
  memPercent: number;
  netRxBytes: number;
  netTxBytes: number;
  blkReadBytes: number;
  blkWriteBytes: number;
}

// ─── Public API ────────────────────────────────────────────

export async function isDockerAvailable(): Promise<{ available: boolean; error?: string; version?: string }> {
  try {
    const res = await dockerHttp("GET", "/version");
    if (res.status !== 200) return { available: false, error: `Docker /version returned ${res.status}` };
    const data = JSON.parse(res.body) as { Version?: string; ApiVersion?: string };
    return { available: true, version: data.Version };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    // Surface the raw error in the server logs (Dokploy) so the *actual*
    // failure is visible, not just the friendly message the client sees.
    console.error(`[docker] isDockerAvailable failed for socket ${DOCKER_SOCKET}:`, msg);
    let friendly = msg;
    if (msg.includes("ENOENT")) {
      friendly = `Docker socket not found at ${DOCKER_SOCKET}. The bind mount was most likely dropped on a Dokploy redeploy — re-add /var/run/docker.sock (and the host docker group). See the "Docker socket" section in CLAUDE.md.`;
    } else if (msg.includes("EACCES")) {
      friendly = `Docker socket exists at ${DOCKER_SOCKET} but isn't readable. The container needs the host's docker group GID added (--group-add). See the "Docker socket" section in CLAUDE.md.`;
    }
    return { available: false, error: friendly };
  }
}

export async function listContainers(includeStopped = true): Promise<ContainerSummary[]> {
  const path = `/containers/json?all=${includeStopped ? 1 : 0}`;
  const res = await dockerHttp("GET", path);
  if (res.status !== 200) throw new Error(`listContainers: HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  return JSON.parse(res.body) as ContainerSummary[];
}

export async function inspectContainer(id: string): Promise<ContainerInspect> {
  const res = await dockerHttp("GET", `/containers/${encodeURIComponent(id)}/json`);
  if (res.status !== 200) throw new Error(`inspectContainer: HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  return JSON.parse(res.body) as ContainerInspect;
}

export async function getContainerStats(id: string): Promise<ContainerStats> {
  const res = await dockerHttp("GET", `/containers/${encodeURIComponent(id)}/stats?stream=false&one-shot=true`);
  if (res.status !== 200) throw new Error(`getContainerStats: HTTP ${res.status}`);
  const raw = JSON.parse(res.body) as DockerStatsRaw;

  // CPU%
  const cpuDelta = raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
  const sysDelta = (raw.cpu_stats.system_cpu_usage ?? 0) - (raw.precpu_stats.system_cpu_usage ?? 0);
  const numCpus = raw.cpu_stats.online_cpus || 1;
  const cpuPercent = sysDelta > 0 && cpuDelta > 0 ? (cpuDelta / sysDelta) * numCpus * 100 : 0;

  // Memory
  const cache = raw.memory_stats.stats?.cache ?? raw.memory_stats.stats?.inactive_file ?? 0;
  const memUsedBytes = Math.max(0, raw.memory_stats.usage - cache);
  const memLimitBytes = raw.memory_stats.limit;
  const memPercent = memLimitBytes > 0 ? (memUsedBytes / memLimitBytes) * 100 : 0;

  // Network — sum across all interfaces
  let netRxBytes = 0;
  let netTxBytes = 0;
  if (raw.networks) {
    for (const iface of Object.values(raw.networks)) {
      netRxBytes += iface.rx_bytes ?? 0;
      netTxBytes += iface.tx_bytes ?? 0;
    }
  }

  // Block IO
  let blkReadBytes = 0;
  let blkWriteBytes = 0;
  if (raw.blkio_stats?.io_service_bytes_recursive) {
    for (const entry of raw.blkio_stats.io_service_bytes_recursive) {
      if (entry.op === "read" || entry.op === "Read") blkReadBytes += entry.value;
      else if (entry.op === "write" || entry.op === "Write") blkWriteBytes += entry.value;
    }
  }

  return { cpuPercent, memUsedBytes, memLimitBytes, memPercent, netRxBytes, netTxBytes, blkReadBytes, blkWriteBytes };
}

/**
 * Container logs. Docker multiplexes stdout/stderr using an 8-byte header per
 * frame; we strip those headers and concatenate.
 */
export async function getContainerLogs(id: string, tail = 200): Promise<string> {
  const path = `/containers/${encodeURIComponent(id)}/logs?stdout=1&stderr=1&tail=${tail}&timestamps=1`;
  const res = await dockerHttpRaw("GET", path);
  if (res.status !== 200) throw new Error(`getContainerLogs: HTTP ${res.status}`);
  return demultiplexLogs(res.buffer);
}

function demultiplexLogs(buf: Buffer): string {
  // Each frame: 8-byte header [stream_type, 0, 0, 0, size4, size3, size2, size1]
  // stream_type: 1 = stdout, 2 = stderr
  // If the container was started WITHOUT a tty, logs are framed.
  // If TTY=true, there are no frame headers.
  // Detect by checking first byte — frame headers start with 0x00, 0x01, or 0x02.
  if (buf.length === 0) return "";
  const firstByte = buf[0];
  if (firstByte > 2) {
    // TTY mode — raw text
    return buf.toString("utf-8");
  }

  const parts: string[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4);
    if (offset + 8 + size > buf.length) break;
    const payload = buf.subarray(offset + 8, offset + 8 + size);
    parts.push(payload.toString("utf-8"));
    offset += 8 + size;
  }
  return parts.join("");
}

export async function restartContainer(id: string): Promise<void> {
  const res = await dockerHttp("POST", `/containers/${encodeURIComponent(id)}/restart`);
  if (res.status !== 204) throw new Error(`restartContainer: HTTP ${res.status}: ${res.body.slice(0, 200)}`);
}

export async function startContainer(id: string): Promise<void> {
  const res = await dockerHttp("POST", `/containers/${encodeURIComponent(id)}/start`);
  if (res.status !== 204 && res.status !== 304) {
    throw new Error(`startContainer: HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  }
}

export async function stopContainer(id: string): Promise<void> {
  const res = await dockerHttp("POST", `/containers/${encodeURIComponent(id)}/stop?t=10`);
  if (res.status !== 204 && res.status !== 304) {
    throw new Error(`stopContainer: HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  }
}

// ─── Helpers / formatting ──────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

/** Pretty container name (Docker prepends "/") */
export function prettyName(names: string[]): string {
  if (!names || names.length === 0) return "?";
  return names[0].replace(/^\//, "");
}

/** Classify container by labels — bkos-stack, dokploy-stack, system */
export function categorizeContainer(c: ContainerSummary): "bkos" | "dokploy" | "system" | "other" {
  const name = prettyName(c.Names);
  if (/^baileyos|^bkos-landing/.test(name)) return "bkos";
  if (/^dokploy/.test(name)) return "dokploy";
  if (c.Labels["com.docker.swarm.service.name"]?.startsWith("dokploy")) return "dokploy";
  return "other";
}
