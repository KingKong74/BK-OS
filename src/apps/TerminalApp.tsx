"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { VFS_ROOT, nodeAtPath, type FsNode } from "@/os/vfs";
import { useOS } from "@/os/store";
import { APPS } from "@/os/appsMeta";

interface Line { kind: "in" | "out"; text: string; cls?: string; prompt?: string; }

const HELP_TEXT = `Commands:
  help              this help
  clear / cls       clear the screen
  ls / ll / dir     list the current directory
  cd <name>         change directory ( .. parent, / root )
  cat <name>        show a file
  pwd               print working directory
  echo <text>       print text
  date · uptime     time info
  whoami · hostname · uname
  theme             current OS theme
  apps              installed apps
  docker ps         live container list (homelab)
  status            live system health summary
  neofetch          system banner
  history           command history`;

const startedAt = Date.now();

function promptPath(p: string[]) {
  return p.length === 0 ? "~" : "~/" + p.join("/");
}

export function TerminalApp() {
  const [cwd, setCwd] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "bailey.os terminal — type 'help' to get started.", cls: "term-dim" },
    { kind: "out", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histPos, setHistPos] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [lines]);

  const out = (text: string, cls?: string) => setLines((ls) => [...ls, { kind: "out", text, cls }]);
  const outMulti = (text: string, cls?: string) =>
    setLines((ls) => [...ls, ...text.split("\n").map((t) => ({ kind: "out" as const, text: t, cls }))]);

  const resolveCd = (target: string): string[] | null => {
    if (!target || target === "/" || target === "~") return [];
    if (target === "..") return cwd.slice(0, -1);
    if (target === ".") return cwd;
    const cur = nodeAtPath(cwd);
    if (!cur || cur.type !== "folder") return null;
    const child = cur.children.find((c) => c.name.toLowerCase() === target.toLowerCase());
    if (!child || child.type !== "folder") return null;
    return [...cwd, child.name];
  };

  const run = async (raw: string) => {
    const cmd = raw.trim();
    setLines((ls) => [...ls, { kind: "in", text: cmd, prompt: promptPath(cwd) }]);
    if (!cmd) return;
    setHistory((h) => [...h, cmd]);
    setHistPos(-1);
    const [name, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");
    const n = name.toLowerCase();

    switch (n) {
      case "help": outMulti(HELP_TEXT); break;
      case "cls":
      case "clear": setLines([]); break;
      case "pwd": out("/c/Users/Bailey" + (cwd.length ? "/" + cwd.join("/") : "")); break;
      case "ls":
      case "ll":
      case "dir": {
        const node = nodeAtPath(cwd);
        if (!node || node.type !== "folder") { out("ls: cannot access path", "term-err"); break; }
        if (node.children.length === 0) { out("(empty)", "term-dim"); break; }
        const folders = node.children.filter((c) => c.type === "folder");
        const files = node.children.filter((c) => c.type !== "folder");
        folders.forEach((c: FsNode) => out(c.name + "/", "term-dir"));
        files.forEach((c: FsNode) => out(c.name));
        break;
      }
      case "cd": {
        const next = resolveCd(arg);
        if (next === null) { out(`cd: ${arg}: no such directory`, "term-err"); break; }
        setCwd(next);
        break;
      }
      case "cat":
      case "type": {
        if (!arg) { out("usage: cat <file>", "term-dim"); break; }
        const node = nodeAtPath(cwd);
        const file = node?.type === "folder" ? node.children.find((c) => c.name.toLowerCase() === arg.toLowerCase()) : undefined;
        if (!file) { out(`cat: ${arg}: no such file`, "term-err"); break; }
        if (file.type !== "file") { out(`cat: ${arg}: is a directory`, "term-err"); break; }
        out(`# ${file.name}  ·  ${file.kind}  ·  ${file.size ?? 0} bytes`, "term-dim");
        out("(contents live in the DB-backed filesystem — open in Notepad to edit)", "term-dim");
        break;
      }
      case "echo": out(arg); break;
      case "date": out(new Date().toString()); break;
      case "uptime": {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        out(`up ${Math.floor(s / 60)}m ${s % 60}s (this terminal session)`);
        break;
      }
      case "whoami": out("bailey"); break;
      case "hostname": out(typeof window !== "undefined" ? window.location.hostname : "bkos"); break;
      case "uname": out("BK-OS 0.1 (Next.js · browser) x86_64"); break;
      case "theme": out("OS theme: " + useOS.getState().scene + "  ·  taskbar: " + useOS.getState().dockStyle, "term-accent"); break;
      case "apps": APPS.filter((a) => a.showInLauncher !== false).forEach((a) => out(`  ${a.id.padEnd(16)} ${a.name}`)); break;
      case "history": history.forEach((h, i) => out(`  ${String(i + 1).padStart(3)}  ${h}`, "term-dim")); break;
      case "motd": out("“The best way to predict the future is to self-host it.”", "term-accent"); break;
      case "docker":
      case "ps": {
        if (n === "docker" && rest[0] !== "ps") { out("usage: docker ps", "term-dim"); break; }
        setBusy(true);
        try {
          const r = await fetch("/api/infra/containers");
          const d = await r.json();
          if (!r.ok) { out(d.error || "docker: unavailable", "term-err"); if (d.hint) out(d.hint, "term-dim"); break; }
          out("NAME".padEnd(28) + "STATE".padEnd(12) + "IMAGE", "term-dim");
          (d.containers || []).forEach((c: { name: string; state: string; image: string }) =>
            out(c.name.slice(0, 26).padEnd(28) + c.state.padEnd(12) + c.image, c.state === "running" ? "term-ok" : "term-dim"));
        } catch { out("docker: request failed", "term-err"); } finally { setBusy(false); }
        break;
      }
      case "status": {
        setBusy(true);
        try {
          const r = await fetch("/api/infra/status");
          const d = await r.json();
          if (!r.ok) { out(d.error || "status: unavailable", "term-err"); break; }
          const cls = d.overall === "ok" ? "term-ok" : d.overall === "fail" ? "term-err" : "term-accent";
          out(`overall: ${d.overall}`, cls);
          (d.checks || []).forEach((c: { label: string; level: string; detail: string }) =>
            out(`  ${c.level === "ok" ? "●" : c.level === "fail" ? "✕" : "▲"} ${c.label.padEnd(14)} ${c.detail}`,
              c.level === "ok" ? "term-ok" : c.level === "fail" ? "term-err" : "term-accent"));
        } catch { out("status: request failed", "term-err"); } finally { setBusy(false); }
        break;
      }
      case "neofetch":
        outMulti([
          "       _________________ ",
          "      |  ___________  |     bailey @ bkos",
          "      | |  bailey.  | |     ---------------",
          "      | |   os 0.1  | |     OS:      BK-OS 0.1",
          "      | |___________| |     Shell:   bkterm",
          "      |_______________|     Theme:   " + useOS.getState().scene,
          "       \\_____________/      Apps:    " + APPS.length,
          "        _____|_|_____       Host:    " + (typeof window !== "undefined" ? window.location.hostname : "bkos"),
          "       |_______________|",
        ].join("\n"), "term-accent");
        break;
      default:
        out(`${name}: command not found  ·  try 'help'`, "term-err");
    }
  };

  const onKey = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); const v = input; setInput(""); await run(v); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histPos < 0 ? history.length - 1 : Math.max(0, histPos - 1);
      setHistPos(next); setInput(history[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histPos < 0) return;
      const next = histPos + 1;
      if (next >= history.length) { setHistPos(-1); setInput(""); }
      else { setHistPos(next); setInput(history[next]); }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault(); setLines([]);
    }
  };

  const Prompt = ({ path }: { path: string }) => (
    <>
      <span className="term-user">bailey@bkos</span>{" "}
      <span className="term-path">{path}</span>{" "}
      <span className="term-dollar">$</span>{" "}
    </>
  );

  return (
    <div className="term-app" onClick={() => inputRef.current?.focus()}>
      <div className="term-output" ref={outRef}>
        {lines.map((l, i) =>
          l.kind === "in" ? (
            <div key={i} className="term-line term-in"><Prompt path={l.prompt ?? "~"} />{l.text}</div>
          ) : (
            <div key={i} className={"term-line" + (l.cls ? " " + l.cls : "")}>{l.text || " "}</div>
          )
        )}
        <div className="term-prompt-row">
          <span className="term-prompt"><Prompt path={promptPath(cwd)} /></span>
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
}
