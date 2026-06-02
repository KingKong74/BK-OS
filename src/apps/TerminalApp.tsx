"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { VFS_ROOT, nodeAtPath, type FsNode } from "@/os/vfs";

interface Line { kind: "in" | "out"; text: string; }

const HELP_TEXT = `Available commands:
  help            Show this help
  cls / clear     Clear the screen
  pwd             Print the current path
  ls / dir        List items in the current path
  cd <name>       Change directory (use .. for parent, / for root)
  cat <name>      Print file metadata
  type <name>     Alias for cat
  echo <text>     Print text
  date            Current date and time
  whoami          Current user
  neofetch        System info`;

function pathToPrompt(p: string[]) {
  return "C:\\" + p.join("\\");
}

export function TerminalApp() {
  const [cwd, setCwd] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "bailey.os Terminal [v1.0]" },
    { kind: "out", text: "(c) 2025. Type 'help' for available commands." },
    { kind: "out", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histPos, setHistPos] = useState<number>(-1);
  const outRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [lines]);

  const print = (text: string) => setLines((ls) => [...ls, { kind: "out", text }]);
  const printMulti = (text: string) =>
    setLines((ls) => [...ls, ...text.split("\n").map((t) => ({ kind: "out" as const, text: t }))]);

  const resolveCd = (target: string): string[] | null => {
    if (!target || target === "/" || target === "\\") return [];
    if (target === "..") return cwd.slice(0, -1);
    if (target === ".") return cwd;
    // single-step into a named child
    const cur = nodeAtPath(cwd);
    if (!cur || cur.type !== "folder") return null;
    const child = cur.children.find((c) => c.name.toLowerCase() === target.toLowerCase());
    if (!child || child.type !== "folder") return null;
    return [...cwd, child.name];
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    setLines((ls) => [...ls, { kind: "in", text: `${pathToPrompt(cwd)}> ${cmd}` }]);
    if (!cmd) return;
    setHistory((h) => [...h, cmd]);
    setHistPos(-1);
    const [name, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");
    const n = name.toLowerCase();
    switch (n) {
      case "help": printMulti(HELP_TEXT); break;
      case "cls":
      case "clear":
        setLines([]); break;
      case "pwd":
        print(pathToPrompt(cwd) || "C:\\"); break;
      case "ls":
      case "dir": {
        const node = nodeAtPath(cwd);
        if (!node || node.type !== "folder") { print("Path not found."); break; }
        if (node.children.length === 0) { print("(empty)"); break; }
        const rows = node.children.map((c: FsNode) => {
          const tag = c.type === "folder" ? "<DIR>" : c.type === "file" ? c.kind : "    ";
          return `  ${tag.padEnd(8)} ${c.name}`;
        });
        printMulti(rows.join("\n"));
        break;
      }
      case "cd": {
        const next = resolveCd(arg);
        if (next === null) { print(`The path '${arg}' is not found.`); break; }
        setCwd(next);
        break;
      }
      case "cat":
      case "type": {
        if (!arg) { print("Usage: cat <filename>"); break; }
        const node = nodeAtPath(cwd);
        if (!node || node.type !== "folder") { print("Path not found."); break; }
        const file = node.children.find((c) => c.name.toLowerCase() === arg.toLowerCase());
        if (!file) { print(`File not found: ${arg}`); break; }
        if (file.type !== "file") { print(`${arg} is a folder.`); break; }
        print(`[${file.name}] kind=${file.kind} size=${file.size ?? 0} bytes`);
        print("(file content not stored in mock filesystem)");
        break;
      }
      case "echo": print(arg); break;
      case "date": print(new Date().toString()); break;
      case "whoami": print("bailey"); break;
      case "neofetch":
        printMulti([
          "       _________________",
          "      |  ___________  |    bailey @ bailey.os",
          "      | |  bailey.  | |    ---------------",
          "      | |   os v1   | |    OS:       bailey.os 1.0",
          "      | |___________| |    Shell:    Terminal",
          "      |_______________|    Theme:    Retro 98",
          "       \\_____________/     Uptime:   since you opened the tab",
          "        _____|_|_____      Apps:     " + 13,
          "       |_______________|",
        ].join("\n"));
        break;
      default:
        print(`'${name}' is not recognized. Type 'help' for commands.`);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); run(input); setInput(""); return; }
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
    }
  };

  return (
    <div className="term-app" onClick={() => inputRef.current?.focus()}>
      <div className="term-output" ref={outRef}>
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "in" ? "term-line term-in" : "term-line"}>{l.text || "\u00A0"}</div>
        ))}
        <div className="term-prompt-row">
          <span className="term-prompt">{pathToPrompt(cwd)}&gt;&nbsp;</span>
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
