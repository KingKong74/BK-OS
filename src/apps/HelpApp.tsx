"use client";

import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";

interface Chapter { id: string; title: string; body: React.ReactNode; }

const CHAPTERS: Chapter[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: (
      <>
        <p>This is <strong>bailey.os</strong> — a personal desktop that lives in a browser window. It hosts your apps, your files, and a few games, behind a single look you can swap whenever you feel like it.</p>
        <p>Open the table of contents on the left and pick a topic. Everything in here is short on purpose.</p>
      </>
    ),
  },
  {
    id: "desktop",
    title: "The desktop",
    body: (
      <>
        <p>Icons on the desktop are shortcuts. <strong>Double-click</strong> an icon to open it.</p>
        <p><strong>Drag</strong> any icon to move it. Icons snap to a grid by default — you can turn that off in Settings.</p>
        <p><strong>Right-click</strong> an icon for Open, Rename, and Delete.</p>
        <p><strong>Right-click the desktop background</strong> for a new sticky note, to open My Computer or Settings, or to tidy the icons back into a clean column.</p>
        <p>To <strong>add a new shortcut</strong>, drag any app out of the Start menu onto the desktop.</p>
      </>
    ),
  },
  {
    id: "sticky-notes",
    title: "Post-it notes",
    body: (
      <>
        <p>Post-it notes live on the desktop, not inside a window. They stay where you put them and survive reloads.</p>
        <p>To make a new one, right-click the desktop and pick <em>New Post-it</em>, or open the Post-it app and use <em>New note</em>.</p>
        <p>To move a note, drag it by its coloured header. The <strong>×</strong> closes the note (it&rsquo;s still in the Post-it app, just hidden from the desktop). The <strong>…</strong> button opens a menu where you can change the paper colour or delete the note for good.</p>
        <p>The Post-it app shows every note — both visible and closed — and lets you delete or re-open them.</p>
      </>
    ),
  },
  {
    id: "file-explorer",
    title: "File Explorer (My Computer)",
    body: (
      <>
        <p>My Computer is the file explorer. It has the classic Win98 stack: menu bar, toolbar, address bar, folders sidebar, and a status bar at the bottom.</p>
        <p>The <strong>address bar</strong> is typeable — click it, type a path like <code>My Computer\Photos\2025</code>, and press Enter to jump there. Or click any segment of the path to jump to that folder.</p>
        <p><strong>Back / Forward / Up</strong> in the toolbar work like a browser.</p>
        <p>Switch between <strong>Icons</strong> and <strong>Details</strong> views with the toolbar buttons on the right.</p>
        <p><strong>Right-click</strong> any file or folder for the action menu (Open, Delete, etc.). Deleted things go to the Recycle Bin and can be restored.</p>
      </>
    ),
  },
  {
    id: "recycle-bin",
    title: "Recycle Bin",
    body: (
      <>
        <p>Deleted files and folders move to the Recycle Bin. The bin icon on the desktop changes from empty to full when there&rsquo;s anything in it.</p>
        <p>Open it to see what&rsquo;s inside, then <em>Restore</em> something back to where it came from, or <em>Delete</em> it permanently. <em>Empty Recycle Bin</em> wipes everything at once.</p>
      </>
    ),
  },
  {
    id: "terminal",
    title: "Terminal",
    body: (
      <>
        <p>The Terminal is a PowerShell-style shell over the same filesystem the explorer uses. Useful commands:</p>
        <ul>
          <li><code>ls</code> or <code>dir</code> — list current folder</li>
          <li><code>cd &lt;name&gt;</code> — change folder (<code>..</code> for parent, <code>/</code> for root)</li>
          <li><code>pwd</code> — show current path</li>
          <li><code>cat &lt;file&gt;</code> — show file metadata</li>
          <li><code>cls</code> or <code>clear</code> — clear the screen</li>
          <li><code>echo</code>, <code>date</code>, <code>whoami</code></li>
          <li><code>neofetch</code> — system info, for fun</li>
        </ul>
        <p>Up / Down arrows recall command history.</p>
      </>
    ),
  },
  {
    id: "games",
    title: "Games",
    body: (
      <>
        <p>The Games shortcut on the desktop opens a folder in the File Explorer with every game. Double-click one to launch it.</p>
        <p>FreeCell is fully playable. Hearts, Spider, Minesweeper, and Tree are placeholders for now — their engines come later.</p>
      </>
    ),
  },
  {
    id: "task-manager",
    title: "Task Manager",
    body: (
      <>
        <p>Task Manager shows every open window and lets you focus, minimize, or End Task each one. The Performance tab has illustrative CPU / Memory bars plus a system info panel.</p>
        <p>Closing Task Manager from inside Task Manager works, by the way.</p>
      </>
    ),
  },
  {
    id: "scenes",
    title: "Scenes (themes)",
    body: (
      <>
        <p>Settings → Appearance has five scenes:</p>
        <ul>
          <li><strong>Retro 98</strong> — the default. Beveled grey chrome, teal desktop, chunky chrome.</li>
          <li><strong>Modern</strong> — clean, rounded, blue accent.</li>
          <li><strong>Dark</strong> — modern shapes, charcoal palette.</li>
          <li><strong>Classic Mac</strong> — System 7 platinum greys, ribbed title bars.</li>
          <li><strong>Terminal</strong> — green-on-black, monospace, glowing.</li>
        </ul>
        <p>Switching scenes is instant. Pick the one that fits the time of day.</p>
      </>
    ),
  },
  {
    id: "dock",
    title: "Dock (taskbar)",
    body: (
      <>
        <p>The bar at the bottom is the dock. From left to right:</p>
        <ul>
          <li><strong>Start</strong> — opens the launcher with every app.</li>
          <li><strong>Search</strong> — type to find any app or any file in My Computer.</li>
          <li><strong>Task View</strong> — see every open window at once.</li>
          <li><strong>Pinned apps</strong> — quick-launch tiles. Drag to reorder.</li>
          <li><strong>Running tasks</strong> — every open window. Click to focus or minimize.</li>
        </ul>
        <p>Right-click any pinned app or running task for pin/unpin and close actions.</p>
      </>
    ),
  },
  {
    id: "shortcuts",
    title: "Mouse & gestures",
    body: (
      <>
        <p><strong>Drag a window&rsquo;s title bar</strong> to a screen edge to snap it: left half, right half, top to maximize, or any corner for a quarter.</p>
        <p><strong>Double-click a title bar</strong> to maximize / restore.</p>
        <p><strong>Drag the bottom-right hatched corner</strong> to resize.</p>
        <p><strong>Right-click almost anywhere</strong> for a context menu — desktop, icons, files, the dock, window title bars.</p>
      </>
    ),
  },
];

export function HelpApp() {
  const [activeId, setActiveId] = useState("welcome");
  const active = CHAPTERS.find((c) => c.id === activeId) ?? CHAPTERS[0];
  return (
    <div className="help-app">
      <aside className="help-toc">
        <div className="help-toc-title">
          <AppIcon id="help" size={20} />
          <span>Contents</span>
        </div>
        {CHAPTERS.map((c) => (
          <button
            key={c.id}
            className={"help-toc-item" + (c.id === activeId ? " is-active" : "")}
            onClick={() => setActiveId(c.id)}
          >
            {c.title}
          </button>
        ))}
      </aside>
      <section className="help-body">
        <h1 className="help-title">{active.title}</h1>
        <div className="help-content">{active.body}</div>
      </section>
    </div>
  );
}
