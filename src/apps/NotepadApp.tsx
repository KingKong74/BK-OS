"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { uniqueName, listChildren, type FileNode } from "@/os/vfs";

interface MenuOpt {
  label?: string;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

const DOCS_PATH = ["C:", "Users", "Bailey", "Documents"];

export function NotepadApp() {
  const focusedId = useOS((s) => s.focusedId);
  const closeWindow = useOS((s) => s.closeWindow);
  const notepadInitial = useOS((s) => s.notepadInitial);
  const setNotepadInitial = useOS((s) => s.setNotepadInitial);
  const fileContents = useOS((s) => s.fileContents);
  const setFileContent = useOS((s) => s.setFileContent);
  const vfsAdditions = useOS((s) => s.vfsAdditions);
  const addVfsNode = useOS((s) => s.addVfsNode);

  const [text, setText] = useState("");
  const [filePath, setFilePath] = useState<string[] | null>(null); // null = unsaved
  const [filename, setFilename] = useState("Untitled.txt");
  const [wordWrap, setWordWrap] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const lineCount = text.split("\n").length;
  const charCount = text.length;

  // On mount or when notepadInitial changes, load that file
  useEffect(() => {
    if (notepadInitial) {
      const fullPath = notepadInitial.path.join("/");
      setFilePath(notepadInitial.path);
      setFilename(notepadInitial.name);
      setText(fileContents[fullPath] ?? "");
      setDirty(false);
      setNotepadInitial(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notepadInitial]);

  const newFile = () => {
    if (dirty && !confirm("Unsaved changes will be lost. Continue?")) return;
    setText("");
    setFilePath(null);
    setFilename("Untitled.txt");
    setDirty(false);
  };

  const saveAt = (path: string[], name: string) => {
    setFileContent(path.join("/"), text);
    setFilePath(path);
    setFilename(name);
    setDirty(false);
  };

  const saveAsToDocuments = () => {
    // Save into C:\Users\Bailey\Documents — find a unique name
    const existing = listChildren(DOCS_PATH, vfsAdditions).map((n) => n.name);
    // Use the current filename, or generate Untitled.txt with a number
    const base = filename || "Untitled.txt";
    const name = uniqueName(base, existing);
    const node: FileNode = {
      type: "file",
      name,
      kind: "doc",
      size: text.length,
      modified: new Date().toISOString().slice(0, 10),
    };
    addVfsNode(DOCS_PATH, node);
    saveAt([...DOCS_PATH, name], name);
  };

  const saveFile = () => {
    if (filePath) {
      saveAt(filePath, filename);
    } else {
      saveAsToDocuments();
    }
  };

  const openFromDisk = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,text/plain";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        setText(String(reader.result ?? ""));
        setFilename(f.name);
        setFilePath(null); // imported from disk; user can save into VFS
        setDirty(true);
      };
      reader.readAsText(f);
    };
    input.click();
  };

  const editAction = (cmd: "cut" | "copy" | "paste" | "selectAll") => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    if (cmd === "selectAll") { ta.select(); return; }
    try {
      document.execCommand(cmd);
    } catch { /* paste may fail without permission */ }
  };

  const menus: Record<string, MenuOpt[]> = {
    File: [
      { label: "New", onClick: newFile },
      { label: "Open from disk…", onClick: openFromDisk },
      { label: "Save", onClick: saveFile },
      { label: "Save to Documents", onClick: saveAsToDocuments },
      { separator: true },
      { label: "Exit", onClick: () => focusedId && closeWindow(focusedId) },
    ],
    Edit: [
      { label: "Undo", onClick: () => { taRef.current?.focus(); try { document.execCommand("undo"); } catch {} } },
      { separator: true },
      { label: "Cut", onClick: () => editAction("cut") },
      { label: "Copy", onClick: () => editAction("copy") },
      { label: "Paste", onClick: () => editAction("paste") },
      { separator: true },
      { label: "Select all", onClick: () => editAction("selectAll") },
    ],
    Format: [
      { label: "Word Wrap", checked: wordWrap, onClick: () => setWordWrap((w) => !w) },
    ],
    Help: [
      { label: "About Notepad", disabled: true },
    ],
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === "s") { e.preventDefault(); saveFile(); }
        else if (e.key === "n") { e.preventDefault(); newFile(); }
        else if (e.key === "o") { e.preventDefault(); openFromDisk(); }
      }
    };
    const ta = taRef.current;
    ta?.addEventListener("keydown", onKey);
    return () => ta?.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, dirty, filename, filePath]);

  const openMenuAt = (id: string) => {
    const btn = btnRefs.current[id];
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setMenuPos({ x: r.left, y: r.bottom });
    setOpenMenuId(id);
  };

  const locationLabel = filePath ? "C:\\" + filePath.slice(1).join("\\") : "Unsaved";

  return (
    <div className="notepad-app">
      <div className="notepad-menubar">
        {Object.keys(menus).map((m) => (
          <button
            key={m}
            ref={(el) => { btnRefs.current[m] = el; }}
            className={"notepad-menu-item" + (openMenuId === m ? " is-open" : "")}
            onClick={() => (openMenuId === m ? setOpenMenuId(null) : openMenuAt(m))}
            onMouseEnter={() => { if (openMenuId) openMenuAt(m); }}
          >{m}</button>
        ))}
      </div>

      <textarea
        ref={taRef}
        className={"notepad-area" + (wordWrap ? " wrap" : " nowrap")}
        value={text}
        spellCheck={false}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        placeholder="Type here…"
      />

      <div className="notepad-status">
        <span className="notepad-status-name">{filename}{dirty ? " •" : ""}</span>
        <span className="notepad-status-location">{locationLabel}</span>
        <span className="notepad-status-spacer" />
        <span>Lines: {lineCount}</span>
        <span>Chars: {charCount}</span>
        <span>{wordWrap ? "Word wrap: on" : "Word wrap: off"}</span>
      </div>

      {openMenuId && menuPos && (
        <>
          <div className="notepad-menu-backdrop" onClick={() => setOpenMenuId(null)} />
          <div className="notepad-menu-dropdown" style={{ left: menuPos.x, top: menuPos.y }}>
            {menus[openMenuId].map((opt, i) =>
              opt.separator ? (
                <div key={i} className="notepad-menu-sep" />
              ) : (
                <button
                  key={i}
                  className="notepad-menu-option"
                  disabled={opt.disabled}
                  onClick={() => { opt.onClick?.(); setOpenMenuId(null); }}
                >
                  <span className="notepad-menu-check">{opt.checked ? "✓" : ""}</span>
                  <span>{opt.label}</span>
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
