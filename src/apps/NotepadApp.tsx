"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { createFsNode, resolvePath, updateFsText, type FsNodeDTO } from "@/hooks/useFs";

interface MenuOpt {
  label?: string;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

export function NotepadApp() {
  const focusedId = useOS((s) => s.focusedId);
  const closeWindow = useOS((s) => s.closeWindow);
  const notepadInitial = useOS((s) => s.notepadInitial);
  const setNotepadInitial = useOS((s) => s.setNotepadInitial);

  const [text, setText] = useState("");
  const [fileId, setFileId] = useState<string | null>(null); // null = unsaved
  const [filename, setFilename] = useState("Untitled.txt");
  const [wordWrap, setWordWrap] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const lineCount = text.split("\n").length;
  const charCount = text.length;

  // When notepadInitial changes, treat its `path[0]` as the fs node id.
  useEffect(() => {
    if (!notepadInitial) return;
    const idCandidate = notepadInitial.path[0];
    setFilename(notepadInitial.name);
    setFileId(idCandidate ?? null);
    setNotepadInitial(null);

    // Fetch contents
    if (idCandidate) {
      fetch(`/api/fs/${idCandidate}`)
        .then((r) => r.json())
        .then((data: { node?: FsNodeDTO; error?: string }) => {
          if (data.node) {
            setText(data.node.textContent ?? "");
            setDirty(false);
          }
        })
        .catch(() => {/* ignore */});
    } else {
      setText("");
      setDirty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notepadInitial]);

  const newFile = () => {
    if (dirty && !confirm("Unsaved changes will be lost. Continue?")) return;
    setText("");
    setFileId(null);
    setFilename("Untitled.txt");
    setDirty(false);
  };

  const saveFile = async () => {
    setSaveStatus("Saving…");
    try {
      if (fileId) {
        await updateFsText(fileId, text);
      } else {
        // Save to Documents
        const docs = await resolvePath(["C:", "Users", "Bailey", "Documents"]);
        if (!docs.id) throw new Error("Could not find Documents folder");
        const baseName = filename || "Untitled.txt";
        const node = await createFsNode(docs.id, baseName, "file", "doc", text);
        setFileId(node.id);
      }
      setDirty(false);
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 1500);
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : "Save failed");
      setTimeout(() => setSaveStatus(""), 3500);
    }
  };

  const saveAs = async () => {
    const name = prompt("Save as filename (will be saved into Documents):", filename);
    if (!name) return;
    setSaveStatus("Saving…");
    try {
      const docs = await resolvePath(["C:", "Users", "Bailey", "Documents"]);
      if (!docs.id) throw new Error("Could not find Documents folder");
      const node = await createFsNode(docs.id, name, "file", "doc", text);
      setFileId(node.id);
      setFilename(name);
      setDirty(false);
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 1500);
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : "Save failed");
      setTimeout(() => setSaveStatus(""), 3500);
    }
  };

  const openFromDisk = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.md,.json,.csv,.log,text/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        setText(String(reader.result ?? ""));
        setFilename(f.name);
        setFileId(null); // imported; needs save-as
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
    try { document.execCommand(cmd); } catch {/* permission */}
  };

  const menus: Record<string, MenuOpt[]> = {
    File: [
      { label: "New", onClick: newFile },
      { label: "Open from disk…", onClick: openFromDisk },
      { label: "Save", onClick: saveFile },
      { label: "Save as…", onClick: saveAs },
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
      { label: (wordWrap ? "✓ " : "") + "Word wrap", onClick: () => setWordWrap((w) => !w) },
    ],
  };

  const openMenu = (id: string) => {
    const r = btnRefs.current[id]?.getBoundingClientRect();
    if (!r) return;
    setMenuPos({ x: r.left, y: r.bottom });
    setOpenMenuId(id);
  };

  // Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, fileId]);

  return (
    <div className="notepad">
      <div className="notepad-menubar" onClick={(e) => e.stopPropagation()}>
        {Object.keys(menus).map((id) => (
          <button
            key={id}
            ref={(el) => { btnRefs.current[id] = el; }}
            className={"notepad-menu-item" + (openMenuId === id ? " is-open" : "")}
            onClick={() => (openMenuId === id ? setOpenMenuId(null) : openMenu(id))}
          >
            {id}
          </button>
        ))}
      </div>
      <textarea
        ref={taRef}
        className="notepad-area"
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        style={{
          whiteSpace: wordWrap ? "pre-wrap" : "pre",
          overflowX: wordWrap ? "hidden" : "auto",
        }}
      />
      <div className="notepad-status">
        <span>{filename}{dirty ? " *" : ""}</span>
        <span>{saveStatus}</span>
        <span style={{ marginLeft: "auto" }}>Ln {lineCount} · {charCount} chars</span>
      </div>
      {openMenuId && menuPos && (
        <>
          <div className="notepad-menu-scrim" onClick={() => setOpenMenuId(null)} />
          <div
            className="notepad-menu-dropdown"
            style={{ left: menuPos.x, top: menuPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {menus[openMenuId].map((opt, idx) => {
              if (opt.separator) return <div key={idx} className="notepad-menu-sep" />;
              return (
                <button
                  key={idx}
                  className="notepad-menu-option"
                  disabled={opt.disabled}
                  onClick={() => { opt.onClick?.(); setOpenMenuId(null); }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
