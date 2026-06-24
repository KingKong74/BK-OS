"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ContainersTab } from "./infrastructure/ContainersTab";

type Tab = "status" | "containers" | "diagnose" | "webdav";

interface Check {
  id: string;
  label: string;
  level: "ok" | "warn" | "fail" | "unknown";
  detail: string;
  meta?: Record<string, string | number>;
  hint?: string;
}

interface StatusResponse {
  checks: Check[];
  overall: "ok" | "warn" | "fail" | "unknown";
  timestamp: string;
}

export function InfrastructureApp() {
  const [tab, setTab] = useState<Tab>("status");
  return (
    <div className="infra-app">
      <nav className="infra-tabs">
        <button className={"infra-tab" + (tab === "status" ? " is-active" : "")} onClick={() => setTab("status")}>
          <Icon name="shield" size={14} /> Status
        </button>
        <button className={"infra-tab" + (tab === "containers" ? " is-active" : "")} onClick={() => setTab("containers")}>
          <Icon name="server" size={14} /> Containers
        </button>
        <button className={"infra-tab" + (tab === "diagnose" ? " is-active" : "")} onClick={() => setTab("diagnose")}>
          <Icon name="search" size={14} /> Diagnose
        </button>
        <button className={"infra-tab" + (tab === "webdav" ? " is-active" : "")} onClick={() => setTab("webdav")}>
          <Icon name="globe" size={14} /> WebDAV
        </button>
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

function StatusTab() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

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

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => setVersion((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="infra-status">
      <div className="infra-toolbar">
        <div className={"infra-overall infra-overall-" + (data?.overall ?? "unknown")}>
          {data?.overall === "ok" && "All systems normal"}
          {data?.overall === "warn" && "Warnings present"}
          {data?.overall === "fail" && "Failures detected"}
          {(!data || data?.overall === "unknown") && "Status unknown"}
        </div>
        <button className="infra-btn" onClick={() => setVersion((v) => v + 1)} disabled={loading}>
          <Icon name="refresh" size={12} /> Refresh
        </button>
      </div>

      {error && <div className="infra-error">{error}</div>}
      {loading && !data && <div className="infra-empty">Running checks…</div>}

      {data && (
        <ul className="infra-check-list">
          {data.checks.map((c) => (
            <li key={c.id} className={"infra-check infra-check-" + c.level}>
              <div className="infra-check-row">
                <span className={"infra-dot infra-dot-" + c.level} />
                <strong className="infra-check-label">{c.label}</strong>
                <span className="infra-check-detail">{c.detail}</span>
              </div>
              {c.hint && (
                <div className="infra-check-hint">
                  <strong>Suggested fix:</strong> {c.hint}
                </div>
              )}
              {c.meta && Object.keys(c.meta).length > 0 && (
                <dl className="infra-check-meta">
                  {Object.entries(c.meta).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && (
        <div className="infra-footer">
          Checked at {new Date(data.timestamp).toLocaleTimeString()}. Auto-refreshes every 30s.
        </div>
      )}
    </div>
  );
}

// ─── Diagnose tab ──────────────────────────────────────────

function DiagnoseTab() {
  const [errorText, setErrorText] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
        setResult(data.diagnosis);
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setErrorText("");
    setContext("");
    setResult(null);
    setApiError(null);
  };

  return (
    <div className="infra-diagnose">
      <p className="infra-blurb">
        Paste an error message, stack trace, or log excerpt. Claude will explain what's likely failing and suggest fixes specific to your homelab stack.
      </p>

      <label className="infra-field">
        <span className="infra-field-label">Optional context (what were you doing?)</span>
        <input
          className="infra-input"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g., trying to set up GitHub integration in Dokploy"
        />
      </label>

      <label className="infra-field">
        <span className="infra-field-label">Error / stack trace / log</span>
        <textarea
          className="infra-textarea"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          placeholder="Paste the error here…"
          rows={10}
        />
      </label>

      <div className="infra-toolbar">
        <button className="infra-btn" onClick={submit} disabled={!errorText.trim() || loading}>
          {loading ? "Diagnosing…" : "Diagnose"}
        </button>
        <button className="infra-btn infra-btn-secondary" onClick={clear} disabled={loading}>
          Clear
        </button>
      </div>

      {apiError && (
        <div className="infra-error infra-diagnose-error">{apiError}</div>
      )}

      {result && (
        <div className="infra-diagnose-result">
          <h4>Diagnosis</h4>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ─── WebDAV tab — show mount instructions ──────────────────

function WebDAVTab() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(`${window.location.protocol}//${window.location.host}/api/webdav/`);
    }
  }, []);

  return (
    <div className="infra-webdav">
      <p className="infra-blurb">
        Mount your BK-OS file system as a network drive. Edit files in your favourite editor — changes sync to BK-OS instantly.
      </p>

      <div className="infra-field">
        <span className="infra-field-label">WebDAV URL</span>
        <div className="infra-copyable">
          <code>{url}</code>
          <button className="infra-btn" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
        </div>
      </div>

      <div className="infra-mount-section">
        <h4>Windows</h4>
        <ol>
          <li>Open File Explorer → right-click <strong>This PC</strong> → <strong>Map network drive</strong></li>
          <li>Drive: pick any letter (e.g. Z:)</li>
          <li>Folder: paste the URL above</li>
          <li>Check <strong>Connect using different credentials</strong></li>
          <li>Sign in with your BK-OS email and password</li>
        </ol>
      </div>

      <div className="infra-mount-section">
        <h4>macOS</h4>
        <ol>
          <li>Finder → <strong>Go</strong> menu → <strong>Connect to Server</strong> (⌘K)</li>
          <li>Paste the URL above</li>
          <li>Connect → sign in with your BK-OS email and password</li>
        </ol>
      </div>

      <div className="infra-mount-section">
        <h4>Linux (GNOME / KDE)</h4>
        <ol>
          <li>File manager → <strong>Other Locations</strong> → <strong>Connect to Server</strong></li>
          <li>Replace <code>https://</code> with <code>davs://</code></li>
          <li>Sign in with your BK-OS email and password</li>
        </ol>
        <p>Or via CLI: <code>gio mount davs://os.bkos.dev/api/webdav/</code></p>
      </div>

      <div className="infra-warning">
        <strong>Note:</strong> WebDAV uses your account password via HTTP Basic auth. The connection is secure (TLS via Cloudflare), but a leaked password would grant filesystem access. Consider creating app-specific passwords in a future Phase.
      </div>
    </div>
  );
}
