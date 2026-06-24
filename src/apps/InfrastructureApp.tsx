"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/os/types";
import { ContainersTab } from "./infrastructure/ContainersTab";

type Tab = "status" | "containers" | "diagnose" | "webdav";
type Level = "ok" | "warn" | "fail" | "unknown";

interface Check {
  id: string;
  label: string;
  level: Level;
  detail: string;
  meta?: Record<string, string | number>;
  hint?: string;
}

interface SystemOverview {
  hostname: string;
  platform: string;
  uptimeSeconds: number | null;
  nodeVersion: string;
  dockerVersion: string | null;
  userCount: number | null;
}

interface StatusResponse {
  checks: Check[];
  system?: SystemOverview;
  overall: Level;
  timestamp: string;
}

const CHECK_ICON: Record<string, IconName> = {
  db: "server",
  "fs-schema": "folder",
  blobs: "file",
  env: "settings",
  github: "globe",
};

export function InfrastructureApp() {
  const [tab, setTab] = useState<Tab>("status");
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "status", label: "Status", icon: "shield" },
    { id: "containers", label: "Containers", icon: "server" },
    { id: "diagnose", label: "Diagnose", icon: "search" },
    { id: "webdav", label: "WebDAV", icon: "globe" },
  ];
  return (
    <div className="infra-app">
      <nav className="infra-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"infra-tab" + (tab === t.id ? " is-active" : "")}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </nav>
      <div className="infra-content">
        {tab === "status" && <StatusTab />}
        {tab === "containers" && <ContainersTab />}
        {tab === "diagnose" && <DiagnoseTab />}
        {tab === "webdav" && <WebDAVTab />}
      </div>
    </div>
  );
}

// ─── Status tab ────────────────────────────────────────────

function fmtUptime(s: number | null | undefined): string {
  if (s == null) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusTab() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [openHint, setOpenHint] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch("/api/infra/status")
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(d?.error || "status failed");
        setData(d);
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "load failed"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [version]);

  useEffect(() => {
    const id = setInterval(() => setVersion((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const checks = data?.checks ?? [];
  const counts = {
    ok: checks.filter((c) => c.level === "ok").length,
    warn: checks.filter((c) => c.level === "warn").length,
    fail: checks.filter((c) => c.level === "fail").length,
  };
  const overall = data?.overall ?? "unknown";
  const overallLabel = overall === "ok" ? "All systems normal"
    : overall === "warn" ? "Warnings present"
    : overall === "fail" ? "Failures detected"
    : "Status unknown";

  const sys = data?.system;

  return (
    <div className="infra-status">
      {/* Prominent overall banner */}
      <div className={"infra-banner infra-banner-" + overall}>
        <span className={"infra-led infra-led-" + overall + " is-lg"} />
        <div className="infra-banner-main">
          <div className="infra-banner-title">{overallLabel}</div>
          <div className="infra-banner-counts">
            <span className="infra-count infra-count-ok">{counts.ok} passing</span>
            <span className="infra-count infra-count-warn">{counts.warn} warning</span>
            <span className="infra-count infra-count-fail">{counts.fail} failing</span>
          </div>
        </div>
        <div className="infra-banner-side">
          {data && <span className="infra-banner-time">Checked {new Date(data.timestamp).toLocaleTimeString()}</span>}
          <button className="infra-btn" onClick={() => setVersion((v) => v + 1)} disabled={loading}>
            <Icon name="refresh" size={12} /> {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* System overview */}
      {sys && (
        <div className="infra-sysgrid">
          <SysCard icon="server" label="Hostname" value={sys.hostname} mono />
          <SysCard icon="refresh" label="Uptime" value={fmtUptime(sys.uptimeSeconds)} />
          <SysCard icon="server" label="Docker" value={sys.dockerVersion ?? "n/a"} mono dim={!sys.dockerVersion} />
          <SysCard icon="code" label="Node" value={sys.nodeVersion} mono />
          <SysCard icon="shield" label="Users" value={sys.userCount != null ? String(sys.userCount) : "—"} />
          <SysCard icon="globe" label="Platform" value={sys.platform} mono />
        </div>
      )}

      {error && <div className="infra-error">{error}</div>}
      {loading && !data && <div className="infra-empty">Running checks…</div>}

      {/* Status cards */}
      {checks.length > 0 && (
        <>
          <div className="infra-section-label">Health checks</div>
          <div className="infra-cardgrid">
            {checks.map((c) => {
              const open = openHint === c.id;
              return (
                <div
                  key={c.id}
                  className={"infra-card infra-card-" + c.level + (c.hint && open ? " is-open" : "")}
                  onClick={() => c.hint && setOpenHint(open ? null : c.id)}
                  role={c.hint ? "button" : undefined}
                >
                  <div className="infra-card-top">
                    <span className="infra-card-icon"><Icon name={CHECK_ICON[c.id] ?? "shield"} size={16} /></span>
                    <span className={"infra-led infra-led-" + c.level} />
                  </div>
                  <div className="infra-card-label">{c.label}</div>
                  <div className="infra-card-detail">{c.detail}</div>
                  {c.meta && Object.keys(c.meta).length > 0 && (
                    <div className="infra-card-meta">
                      {Object.entries(c.meta).map(([k, v]) => (
                        <span key={k}><b>{k}</b> {String(v)}</span>
                      ))}
                    </div>
                  )}
                  {c.hint && (
                    <div className="infra-card-hintrow">
                      <Icon name="chevron-right" size={11} />
                      {open ? "Hide fix" : "Fix hint"}
                    </div>
                  )}
                  {c.hint && open && <div className="infra-card-hint">{c.hint}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {data && (
        <div className="infra-footer">Auto-refreshes every 30s.</div>
      )}
    </div>
  );
}

function SysCard({ icon, label, value, mono, dim }: { icon: IconName; label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div className="infra-syscard">
      <span className="infra-syscard-icon"><Icon name={icon} size={14} /></span>
      <div className="infra-syscard-body">
        <div className="infra-syscard-label">{label}</div>
        <div className={"infra-syscard-value" + (mono ? " is-mono" : "") + (dim ? " is-dim" : "")} title={value}>{value}</div>
      </div>
    </div>
  );
}

// ─── Diagnose tab ──────────────────────────────────────────

interface DiagnoseEntry {
  id: string;
  ts: string;
  error: string;
  context?: string;
  diagnosis: string;
}

const PRESETS: { label: string; error: string; context: string }[] = [
  {
    label: "Postgres connection refused",
    error: "Error: connect ECONNREFUSED 10.0.1.5:5432\n    at TCPConnectWrap.afterConnect",
    context: "The bailey-os container can't reach Postgres",
  },
  {
    label: "GitHub webhook 301",
    error: "Webhook delivery failed: received HTTP 301 Moved Permanently from the deploy endpoint",
    context: "GitHub auto-deploy webhook to Dokploy",
  },
  {
    label: "Docker socket EACCES",
    error: "Error: connect EACCES /var/run/docker.sock",
    context: "Infrastructure → Containers tab failing to list containers",
  },
  {
    label: "DNS ENOTFOUND in container",
    error: "Error: getaddrinfo ENOTFOUND api.github.com",
    context: "A container can't resolve external hostnames",
  },
];

const HISTORY_KEY = "bkos-diagnose-history";

function DiagnoseTab() {
  const [errorText, setErrorText] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<DiagnoseEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [history, setHistory] = useState<DiagnoseEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = (next: DiagnoseEntry[]) => {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 20))); } catch { /* ignore */ }
  };

  const applyPreset = (p: { error: string; context: string }) => {
    setErrorText(p.error);
    setContext(p.context);
    setResult(null);
    setApiError(null);
  };

  const submit = async () => {
    if (!errorText.trim()) return;
    setLoading(true);
    setApiError(null);
    setResult(null);
    try {
      const res = await fetch("/api/infra/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorText, context: context || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error + (data.hint ? `\n\n${data.hint}` : "") + (data.detail ? `\n\n${data.detail}` : ""));
      } else {
        const entry: DiagnoseEntry = {
          id: `${Date.now().toString(36)}`,
          ts: new Date().toISOString(),
          error: errorText,
          context: context || undefined,
          diagnosis: data.diagnosis,
        };
        setResult(entry);
        persist([entry, ...history].slice(0, 20));
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setErrorText(""); setContext(""); setResult(null); setApiError(null); };

  return (
    <div className="infra-diagnose">
      <p className="infra-blurb">
        Paste an error, stack trace, or log excerpt. Claude explains what&rsquo;s likely failing and how to fix it — tuned to this homelab stack.
      </p>

      <div className="infra-section-label">Quick diagnose</div>
      <div className="diag-chips">
        {PRESETS.map((p) => (
          <button key={p.label} className="diag-chip" onClick={() => applyPreset(p)}>{p.label}</button>
        ))}
      </div>

      <label className="infra-field">
        <span className="infra-field-label">Optional context</span>
        <input
          className="infra-input"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. setting up GitHub integration in Dokploy"
        />
      </label>

      <label className="infra-field">
        <span className="infra-field-label">Error / stack trace / log</span>
        <textarea
          className="infra-textarea"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          placeholder="Paste the error here…"
          rows={8}
        />
      </label>

      <div className="infra-toolbar">
        <button className="infra-btn infra-btn-primary" onClick={submit} disabled={!errorText.trim() || loading}>
          {loading ? "Diagnosing…" : "Diagnose"}
        </button>
        <button className="infra-btn infra-btn-secondary" onClick={clear} disabled={loading}>Clear</button>
      </div>

      {apiError && <div className="infra-error infra-diagnose-error">{apiError}</div>}

      {(result || loading) && (
        <div className="diag-thread">
          {result && (
            <div className="diag-msg diag-msg-user">
              <div className="diag-msg-role">You</div>
              {result.context && <div className="diag-msg-context">{result.context}</div>}
              <pre className="diag-msg-error">{result.error}</pre>
            </div>
          )}
          <div className="diag-msg diag-msg-ai">
            <div className="diag-msg-role"><Icon name="shield" size={12} /> Claude</div>
            {loading ? <div className="diag-typing">Thinking…</div> : <pre className="diag-msg-body">{result?.diagnosis}</pre>}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="diag-history">
          <div className="infra-section-label">
            History
            <button className="diag-history-clear" onClick={() => persist([])}>Clear all</button>
          </div>
          {history.map((h) => (
            <button key={h.id} className="diag-history-row" onClick={() => { setResult(h); setErrorText(h.error); setContext(h.context || ""); }}>
              <span className="diag-history-time">{new Date(h.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="diag-history-preview">{h.error.split("\n")[0].slice(0, 80)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WebDAV tab ────────────────────────────────────────────

type Platform = "windows" | "macos" | "linux";

function WebDAVTab() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>("windows");
  const [test, setTest] = useState<{ state: "idle" | "testing" | "up" | "down"; detail?: string }>({ state: "idle" });
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(`${window.location.protocol}//${window.location.host}/api/webdav/`);
    }
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    }).catch(() => { /* ignore */ });
  };

  const runTest = async () => {
    setTest({ state: "testing" });
    try {
      // Auth-less PROPFIND: any HTTP response (even 401) means the endpoint
      // is alive. Only a network-level failure means it's down.
      const res = await fetch(url, { method: "PROPFIND", headers: { Depth: "0" } });
      setTest({ state: "up", detail: `Endpoint responding (HTTP ${res.status}${res.status === 401 ? " — auth required, as expected" : ""})` });
    } catch (e) {
      setTest({ state: "down", detail: e instanceof Error ? e.message : "no response" });
    }
  };

  return (
    <div className="infra-webdav">
      <p className="infra-blurb">
        Mount your BK-OS file system as a network drive — edit in your favourite app, changes sync instantly.
      </p>

      <div className="infra-section-label">Mount URL</div>
      <div className="webdav-url">
        <code>{url}</code>
        <button className="infra-btn infra-btn-primary" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
      </div>
      <div className="webdav-test">
        <button className="infra-btn" onClick={runTest} disabled={test.state === "testing"}>
          {test.state === "testing" ? "Testing…" : "Test connection"}
        </button>
        {test.state !== "idle" && test.state !== "testing" && (
          <span className={"webdav-test-result webdav-test-" + test.state}>
            <span className={"infra-led infra-led-" + (test.state === "up" ? "ok" : "fail")} />
            {test.detail}
          </span>
        )}
      </div>

      <div className="webdav-platforms">
        {(["windows", "macos", "linux"] as Platform[]).map((p) => (
          <button
            key={p}
            className={"webdav-ptab" + (platform === p ? " is-active" : "")}
            onClick={() => setPlatform(p)}
          >
            {p === "windows" ? "Windows" : p === "macos" ? "macOS" : "Linux"}
          </button>
        ))}
      </div>

      <div className="webdav-steps">
        {platform === "windows" && (
          <ol>
            <li>File Explorer → right-click <strong>This PC</strong> → <strong>Map network drive</strong></li>
            <li>Drive: pick any letter (e.g. Z:)</li>
            <li>Folder: paste the URL above</li>
            <li>Check <strong>Connect using different credentials</strong></li>
            <li>Sign in with your BK-OS email and password</li>
          </ol>
        )}
        {platform === "macos" && (
          <ol>
            <li>Finder → <strong>Go</strong> → <strong>Connect to Server</strong> (⌘K)</li>
            <li>Paste the URL above</li>
            <li>Connect → sign in with your BK-OS email and password</li>
          </ol>
        )}
        {platform === "linux" && (
          <ol>
            <li>File manager → <strong>Other Locations</strong> → <strong>Connect to Server</strong></li>
            <li>Replace <code>https://</code> with <code>davs://</code></li>
            <li>Sign in with your BK-OS email and password</li>
            <li>Or via CLI: <code>gio mount davs://os.bkos.dev/api/webdav/</code></li>
          </ol>
        )}
      </div>

      <div className="infra-warning">
        <strong>Note:</strong> WebDAV authenticates with your account password over HTTP Basic. The connection is TLS-secured via Cloudflare, but a leaked password grants filesystem access. App-specific passwords are a future Phase.
      </div>
    </div>
  );
}
