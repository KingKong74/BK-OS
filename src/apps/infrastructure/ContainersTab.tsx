"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

interface ContainerDTO {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
  category: "bkos" | "dokploy" | "system" | "other";
  labels: { service?: string; task?: string };
  ports: string[];
}

interface StatsDTO {
  cpuPercent: number;
  memUsedBytes: number;
  memLimitBytes: number;
  memPercent: number;
  netRxBytes: number;
  netTxBytes: number;
  blkReadBytes: number;
  blkWriteBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function ContainersTab() {
  const [containers, setContainers] = useState<ContainerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<"all" | "bkos" | "dokploy" | "system">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [dockerVersion, setDockerVersion] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setErrorHint(null);
    fetch("/api/infra/containers")
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) {
          setError(d.error || "load failed");
          setErrorHint(d.hint || d.detail || null);
          setContainers([]);
        } else {
          setContainers(d.containers || []);
          setDockerVersion(d.dockerVersion || null);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : "load failed");
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [version]);

  useEffect(() => {
    const id = setInterval(() => setVersion((v) => v + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const refresh = () => setVersion((v) => v + 1);

  const doAction = async (id: string, action: "restart" | "stop" | "start") => {
    if (action !== "start") {
      const c = containers.find((x) => x.id === id);
      if (c && !confirm(`${action[0].toUpperCase()}${action.slice(1)} ${c.name}?`)) return;
    }
    setActionPending(`${id}:${action}`);
    try {
      const res = await fetch(`/api/infra/containers/${id}/${action}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        alert(`${action} failed: ${d.detail || d.error}`);
      } else {
        setTimeout(refresh, 1000);
      }
    } catch (e) {
      alert(`${action} error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setActionPending(null);
    }
  };

  const filtered = filter === "all"
    ? containers
    : containers.filter((c) => c.category === filter);

  const counts = {
    all: containers.length,
    bkos: containers.filter((c) => c.category === "bkos").length,
    dokploy: containers.filter((c) => c.category === "dokploy").length,
    system: containers.filter((c) => c.category === "system" || c.category === "other").length,
  };

  return (
    <div className="containers-tab">
      <div className="infra-toolbar">
        <div className="containers-filter">
          {(["all", "bkos", "dokploy", "system"] as const).map((k) => (
            <button
              key={k}
              className={"infra-btn" + (filter === k ? " is-active" : "")}
              onClick={() => setFilter(k)}
            >
              {k === "bkos" ? "BK-OS" : k.charAt(0).toUpperCase() + k.slice(1)}
              <span className="containers-filter-count">{counts[k]}</span>
            </button>
          ))}
        </div>
        <button className="infra-btn" onClick={refresh} disabled={loading}>
          <Icon name="refresh" size={12} /> Refresh
        </button>
        {dockerVersion && (
          <span className="containers-meta">Docker {dockerVersion}</span>
        )}
      </div>

      {error && (
        <div className="infra-error">
          <strong>{error}</strong>
          {errorHint && <div style={{ marginTop: 6 }}>{errorHint}</div>}
        </div>
      )}

      {loading && containers.length === 0 && !error && (
        <div className="infra-empty">Loading containers…</div>
      )}

      {!error && filtered.length === 0 && !loading && (
        <div className="infra-empty">No containers in this category.</div>
      )}

      {filtered.map((c) => (
        <ContainerRow
          key={c.id}
          container={c}
          expanded={expandedId === c.id}
          onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
          onAction={(a) => doAction(c.id, a)}
          actionPending={actionPending}
        />
      ))}
    </div>
  );
}

function ContainerRow({
  container,
  expanded,
  onToggle,
  onAction,
  actionPending,
}: {
  container: ContainerDTO;
  expanded: boolean;
  onToggle: () => void;
  onAction: (a: "restart" | "stop" | "start") => void;
  actionPending: string | null;
}) {
  const running = container.state === "running";
  const stateLevel = running
    ? "ok"
    : container.state === "restarting"
      ? "warn"
      : container.state === "paused"
        ? "warn"
        : "fail";

  return (
    <div className={"container-row" + (expanded ? " is-expanded" : "")}>
      <div className="container-row-header" onClick={onToggle}>
        <span className={"infra-dot infra-dot-" + stateLevel} />
        <span className="container-name">{container.name}</span>
        <span className={"container-state container-state-" + container.state}>{container.state}</span>
        <span className="container-status">{container.status}</span>
        <span className="container-image">{container.image}</span>
        <Icon name="chevron-right" size={12} />
      </div>

      {expanded && (
        <div className="container-expanded">
          <div className="container-actions">
            {running ? (
              <>
                <button
                  className="infra-btn"
                  onClick={(e) => { e.stopPropagation(); onAction("restart"); }}
                  disabled={actionPending !== null}
                >
                  {actionPending === `${container.id}:restart` ? "Restarting…" : "Restart"}
                </button>
                <button
                  className="infra-btn"
                  onClick={(e) => { e.stopPropagation(); onAction("stop"); }}
                  disabled={actionPending !== null}
                >
                  {actionPending === `${container.id}:stop` ? "Stopping…" : "Stop"}
                </button>
              </>
            ) : (
              <button
                className="infra-btn"
                onClick={(e) => { e.stopPropagation(); onAction("start"); }}
                disabled={actionPending !== null}
              >
                {actionPending === `${container.id}:start` ? "Starting…" : "Start"}
              </button>
            )}
          </div>

          {running && <StatsPanel id={container.id} />}
          <LogsPanel id={container.id} />

          <details className="container-details">
            <summary>Metadata</summary>
            <dl className="container-meta">
              <div><dt>ID</dt><dd>{container.id.slice(0, 12)}</dd></div>
              <div><dt>Image</dt><dd>{container.image}</dd></div>
              <div><dt>Created</dt><dd>{new Date(container.createdAt).toLocaleString()}</dd></div>
              {container.labels.service && <div><dt>Service</dt><dd>{container.labels.service}</dd></div>}
              {container.labels.task && <div><dt>Task</dt><dd>{container.labels.task}</dd></div>}
              {container.ports.length > 0 && <div><dt>Ports</dt><dd>{container.ports.join(", ")}</dd></div>}
            </dl>
          </details>
        </div>
      )}
    </div>
  );
}

function StatsPanel({ id }: { id: string }) {
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/infra/containers/${id}/stats`)
        .then(async (r) => {
          const d = await r.json();
          if (!alive) return;
          if (!r.ok) setError(d.detail || d.error);
          else { setStats(d); setError(null); }
        })
        .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "stats failed"); });
    };
    load();
    const intervalId = setInterval(load, 5_000);
    return () => { alive = false; clearInterval(intervalId); };
  }, [id]);

  if (error) return <div className="infra-error" style={{ marginTop: 8 }}>{error}</div>;
  if (!stats) return <div className="container-stats-loading">Loading stats…</div>;

  return (
    <div className="container-stats">
      <div className="container-stat">
        <div className="container-stat-label">CPU</div>
        <div className="container-stat-value">{stats.cpuPercent.toFixed(1)}%</div>
        <div className="container-stat-bar"><span style={{ width: `${Math.min(100, stats.cpuPercent)}%` }} /></div>
      </div>
      <div className="container-stat">
        <div className="container-stat-label">Memory</div>
        <div className="container-stat-value">{formatBytes(stats.memUsedBytes)} / {formatBytes(stats.memLimitBytes)}</div>
        <div className="container-stat-bar"><span style={{ width: `${Math.min(100, stats.memPercent)}%` }} /></div>
      </div>
      <div className="container-stat">
        <div className="container-stat-label">Network</div>
        <div className="container-stat-value">↓ {formatBytes(stats.netRxBytes)} · ↑ {formatBytes(stats.netTxBytes)}</div>
      </div>
      <div className="container-stat">
        <div className="container-stat-label">Disk I/O</div>
        <div className="container-stat-value">R {formatBytes(stats.blkReadBytes)} · W {formatBytes(stats.blkWriteBytes)}</div>
      </div>
    </div>
  );
}

function LogsPanel({ id }: { id: string }) {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tail, setTail] = useState(200);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/infra/containers/${id}/logs?tail=${tail}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.detail || d.error);
        else setLogs(d.logs || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "logs failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tail]);

  return (
    <div className="container-logs-section">
      <div className="container-logs-header">
        <strong>Logs</strong>
        <select value={tail} onChange={(e) => setTail(Number(e.target.value))}>
          <option value={50}>Last 50 lines</option>
          <option value={200}>Last 200 lines</option>
          <option value={500}>Last 500 lines</option>
          <option value={2000}>Last 2000 lines</option>
        </select>
        <button className="infra-btn" onClick={load} disabled={loading}>
          {loading ? "…" : "Reload"}
        </button>
      </div>
      {error && <div className="infra-error">{error}</div>}
      <pre className="container-logs">{logs || "(no log output)"}</pre>
    </div>
  );
}
