"use client";

import { useEffect, useMemo, useState } from "react";
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

type CategoryFilter = "all" | "bkos" | "dokploy" | "system";
type StateFilter = "all" | "running" | "exited";
type SortBy = "name" | "cpu" | "mem";

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
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [dockerVersion, setDockerVersion] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, StatsDTO | null>>({});
  const [fullscreenLogs, setFullscreenLogs] = useState<{ id: string; name: string } | null>(null);

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
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "load failed"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [version]);

  useEffect(() => {
    const id = setInterval(() => setVersion((v) => v + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  // Centralised live stats for all running containers — powers the inline
  // header bars AND the expanded panel, so nothing double-fetches.
  const runningKey = containers.filter((c) => c.state === "running").map((c) => c.id).sort().join(",");
  useEffect(() => {
    if (!runningKey) { setStatsMap({}); return; }
    let alive = true;
    const ids = runningKey.split(",");
    const load = async () => {
      const entries = await Promise.all(ids.map(async (id) => {
        try {
          const r = await fetch(`/api/infra/containers/${id}/stats`);
          if (!r.ok) return [id, null] as const;
          return [id, (await r.json()) as StatsDTO] as const;
        } catch { return [id, null] as const; }
      }));
      if (alive) setStatsMap(Object.fromEntries(entries));
    };
    load();
    const t = setInterval(load, 5_000);
    return () => { alive = false; clearInterval(t); };
  }, [runningKey]);

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
      if (!res.ok) alert(`${action} failed: ${d.detail || d.error}`);
      else setTimeout(refresh, 1000);
    } catch (e) {
      alert(`${action} error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setActionPending(null);
    }
  };

  const counts = {
    all: containers.length,
    bkos: containers.filter((c) => c.category === "bkos").length,
    dokploy: containers.filter((c) => c.category === "dokploy").length,
    system: containers.filter((c) => c.category === "system" || c.category === "other").length,
  };

  const filtered = useMemo(() => {
    let list = category === "all" ? containers
      : containers.filter((c) => category === "system" ? (c.category === "system" || c.category === "other") : c.category === category);
    if (stateFilter !== "all") {
      list = list.filter((c) => stateFilter === "running" ? c.state === "running" : c.state !== "running");
    }
    return list;
  }, [containers, category, stateFilter]);

  const sortItems = useMemo(() => (items: ContainerDTO[]) => {
    const arr = [...items];
    if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "cpu") arr.sort((a, b) => (statsMap[b.id]?.cpuPercent ?? -1) - (statsMap[a.id]?.cpuPercent ?? -1));
    else arr.sort((a, b) => (statsMap[b.id]?.memUsedBytes ?? -1) - (statsMap[a.id]?.memUsedBytes ?? -1));
    return arr;
  }, [sortBy, statsMap]);

  // Group multi-replica swarm services; everything else is a flat row.
  const { groups, flat } = useMemo(() => {
    const byService = new Map<string, ContainerDTO[]>();
    const standalone: ContainerDTO[] = [];
    for (const c of filtered) {
      if (c.labels.service) {
        if (!byService.has(c.labels.service)) byService.set(c.labels.service, []);
        byService.get(c.labels.service)!.push(c);
      } else standalone.push(c);
    }
    const grouped: { service: string; items: ContainerDTO[] }[] = [];
    for (const [service, items] of byService) {
      if (items.length > 1) grouped.push({ service, items: sortItems(items) });
      else standalone.push(items[0]);
    }
    grouped.sort((a, b) => a.service.localeCompare(b.service));
    return { groups: grouped, flat: sortItems(standalone) };
  }, [filtered, sortItems]);

  const rowProps = (c: ContainerDTO) => ({
    container: c,
    stats: statsMap[c.id] ?? null,
    expanded: expandedId === c.id,
    onToggle: () => setExpandedId(expandedId === c.id ? null : c.id),
    onAction: (a: "restart" | "stop" | "start") => doAction(c.id, a),
    onFullscreenLogs: () => setFullscreenLogs({ id: c.id, name: c.name }),
    actionPending,
  });

  return (
    <div className="containers-tab">
      <div className="containers-controls">
        <div className="containers-filter">
          {(["all", "bkos", "dokploy", "system"] as CategoryFilter[]).map((k) => (
            <button key={k} className={"infra-chip" + (category === k ? " is-active" : "")} onClick={() => setCategory(k)}>
              {k === "bkos" ? "BK-OS" : k.charAt(0).toUpperCase() + k.slice(1)}
              <span className="infra-chip-count">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="containers-controls-right">
          <label className="containers-select">
            State
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as StateFilter)}>
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="exited">Stopped</option>
            </select>
          </label>
          <label className="containers-select">
            Sort
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="name">Name</option>
              <option value="cpu">CPU</option>
              <option value="mem">Memory</option>
            </select>
          </label>
          <button className="infra-btn" onClick={refresh} disabled={loading}>
            <Icon name="refresh" size={12} /> {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>
      {dockerVersion && <div className="containers-meta">Docker Engine {dockerVersion}</div>}

      {error && (
        <div className="infra-error">
          <strong>{error}</strong>
          {errorHint && <div style={{ marginTop: 6 }}>{errorHint}</div>}
        </div>
      )}

      {loading && containers.length === 0 && !error && <div className="infra-empty">Loading containers…</div>}
      {!error && filtered.length === 0 && !loading && <div className="infra-empty">No containers match this filter.</div>}

      {groups.map((g) => (
        <div key={g.service} className="container-group">
          <div className="container-group-head">
            <Icon name="server" size={12} />
            <span className="container-group-name">{g.service}</span>
            <span className="container-group-badge">{g.items.length} replicas</span>
          </div>
          {g.items.map((c) => <ContainerRow key={c.id} {...rowProps(c)} nested />)}
        </div>
      ))}
      {flat.map((c) => <ContainerRow key={c.id} {...rowProps(c)} />)}

      {fullscreenLogs && (
        <LogsFullscreen id={fullscreenLogs.id} name={fullscreenLogs.name} onClose={() => setFullscreenLogs(null)} />
      )}
    </div>
  );
}

function MiniBar({ label, percent, tone }: { label: string; percent: number; tone: "cpu" | "mem" }) {
  return (
    <span className="cbar">
      <span className="cbar-label">{label}</span>
      <span className="cbar-track">
        <span className={"cbar-fill cbar-" + tone} style={{ width: `${Math.min(100, Math.max(2, percent))}%` }} />
      </span>
      <span className="cbar-val">{percent.toFixed(0)}%</span>
    </span>
  );
}

function ContainerRow({
  container, stats, expanded, onToggle, onAction, onFullscreenLogs, actionPending, nested,
}: {
  container: ContainerDTO;
  stats: StatsDTO | null;
  expanded: boolean;
  onToggle: () => void;
  onAction: (a: "restart" | "stop" | "start") => void;
  onFullscreenLogs: () => void;
  actionPending: string | null;
  nested?: boolean;
}) {
  const running = container.state === "running";

  return (
    <div className={"container-row" + (expanded ? " is-expanded" : "") + (nested ? " is-nested" : "")}>
      <div className="container-row-header" onClick={onToggle}>
        <span className={"infra-led infra-led-" + (running ? "ok" : container.state === "restarting" || container.state === "paused" ? "warn" : "fail")} />
        <span className="container-name">{container.name}</span>
        <span className={"container-badge container-badge-" + container.state}>{container.state}</span>
        {running && stats ? (
          <span className="container-bars">
            <MiniBar label="CPU" percent={stats.cpuPercent} tone="cpu" />
            <MiniBar label="MEM" percent={stats.memPercent} tone="mem" />
          </span>
        ) : (
          <span className="container-status">{container.status}</span>
        )}
        <span className="container-image">{container.image}</span>
        <Icon name="chevron-right" size={12} />
      </div>

      {expanded && (
        <div className="container-expanded">
          <div className="container-actions">
            {running ? (
              <>
                <button className="infra-btn" onClick={(e) => { e.stopPropagation(); onAction("restart"); }} disabled={actionPending !== null}>
                  {actionPending === `${container.id}:restart` ? "Restarting…" : "Restart"}
                </button>
                <button className="infra-btn" onClick={(e) => { e.stopPropagation(); onAction("stop"); }} disabled={actionPending !== null}>
                  {actionPending === `${container.id}:stop` ? "Stopping…" : "Stop"}
                </button>
              </>
            ) : (
              <button className="infra-btn" onClick={(e) => { e.stopPropagation(); onAction("start"); }} disabled={actionPending !== null}>
                {actionPending === `${container.id}:start` ? "Starting…" : "Start"}
              </button>
            )}
          </div>

          {running && <StatsPanel stats={stats} />}
          <LogsPanel id={container.id} onFullscreen={onFullscreenLogs} />

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

function StatsPanel({ stats }: { stats: StatsDTO | null }) {
  if (!stats) return <div className="container-stats-loading">Loading stats…</div>;
  return (
    <div className="container-stats">
      <div className="container-stat">
        <div className="container-stat-label">CPU</div>
        <div className="container-stat-value">{stats.cpuPercent.toFixed(1)}%</div>
        <div className="container-stat-bar"><span className="cbar-cpu" style={{ width: `${Math.min(100, stats.cpuPercent)}%` }} /></div>
      </div>
      <div className="container-stat">
        <div className="container-stat-label">Memory</div>
        <div className="container-stat-value">{formatBytes(stats.memUsedBytes)} / {formatBytes(stats.memLimitBytes)}</div>
        <div className="container-stat-bar"><span className="cbar-mem" style={{ width: `${Math.min(100, stats.memPercent)}%` }} /></div>
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

/** Render a log buffer as terminal lines: dim timestamps, highlighted ERROR/WARN. */
function LogLines({ text }: { text: string }) {
  const lines = text.replace(/\n$/, "").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        // Docker timestamps=1 prepends an RFC3339 timestamp + space.
        const m = line.match(/^(\S+?Z)\s(.*)$/);
        const ts = m ? m[1] : null;
        const rest = m ? m[2] : line;
        const lvl = /\b(error|fatal|panic)\b/i.test(rest) ? "err"
          : /\b(warn|warning)\b/i.test(rest) ? "warn" : "";
        return (
          <div key={i} className={"logline" + (lvl ? " logline-" + lvl : "")}>
            {ts && <span className="logline-ts">{ts.replace("T", " ").replace(/\.\d+Z$/, "")}</span>}
            <span className="logline-msg">{rest || " "}</span>
          </div>
        );
      })}
    </>
  );
}

function useLogs(id: string, tail: number) {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, tail]);
  return { logs, loading, error, reload: load };
}

function LogsPanel({ id, onFullscreen }: { id: string; onFullscreen: () => void }) {
  const [tail, setTail] = useState(200);
  const { logs, loading, error, reload } = useLogs(id, tail);

  return (
    <div className="container-logs-section">
      <div className="container-logs-header">
        <strong>Logs</strong>
        <select value={tail} onChange={(e) => setTail(Number(e.target.value))}>
          <option value={50}>Last 50</option>
          <option value={200}>Last 200</option>
          <option value={500}>Last 500</option>
          <option value={2000}>Last 2000</option>
        </select>
        <button className="infra-btn" onClick={reload} disabled={loading}>{loading ? "…" : "Reload"}</button>
        <button className="infra-btn infra-btn-secondary" onClick={onFullscreen} title="Fullscreen logs">
          <Icon name="maximize" size={11} /> Fullscreen
        </button>
      </div>
      {error && <div className="infra-error">{error}</div>}
      <div className="container-logs"><LogLines text={logs || "(no log output)"} /></div>
    </div>
  );
}

function LogsFullscreen({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [tail, setTail] = useState(500);
  const { logs, loading, error, reload } = useLogs(id, tail);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="logs-fs-overlay" onClick={onClose}>
      <div className="logs-fs" onClick={(e) => e.stopPropagation()}>
        <div className="logs-fs-bar">
          <span className="logs-fs-title"><Icon name="server" size={13} /> {name} — logs</span>
          <select value={tail} onChange={(e) => setTail(Number(e.target.value))}>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
            <option value={2000}>Last 2000</option>
          </select>
          <button className="infra-btn" onClick={reload} disabled={loading}>{loading ? "…" : "Reload"}</button>
          <button className="infra-btn infra-btn-secondary" onClick={onClose}><Icon name="close" size={11} /> Close</button>
        </div>
        {error && <div className="infra-error">{error}</div>}
        <div className="logs-fs-body"><LogLines text={logs || "(no log output)"} /></div>
      </div>
    </div>
  );
}
