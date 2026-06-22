"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { saveTasks } from "./data";
import { genId, type Task } from "./types";

interface Props {
  tasksFileId: string;
  initialTasks: Task[];
}

export function ProjectTasks({ tasksFileId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [status, setStatus] = useState<string>("");
  const saveTimer = useRef<number | null>(null);
  const firstLoad = useRef(true);

  // Reset when project changes
  useEffect(() => {
    setTasks(initialTasks);
    firstLoad.current = true;
  }, [tasksFileId, initialTasks]);

  // Debounced auto-save whenever tasks change
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (!tasksFileId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("Saving…");
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveTasks(tasksFileId, tasks);
        setStatus("Saved");
        setTimeout(() => setStatus(""), 1500);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "save failed");
      }
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [tasks, tasksFileId]);

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((prev) => [
      ...prev,
      { id: genId(), text, done: false, createdAt: new Date().toISOString() },
    ]);
    setDraft("");
  };

  const toggleDone = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditDraft(task.text);
  };
  const commitEdit = () => {
    if (!editingId) return;
    const text = editDraft.trim();
    if (text) {
      setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, text } : t)));
    }
    setEditingId(null);
    setEditDraft("");
  };

  const openCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - openCount;

  return (
    <div className="proj-tasks">
      <div className="proj-section-toolbar">
        <h3 className="proj-section-title">
          Tasks · {openCount} open{doneCount > 0 ? `, ${doneCount} done` : ""}
        </h3>
        {status && <span className="proj-status">{status}</span>}
      </div>

      <div className="proj-task-add">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTask(); }
          }}
          placeholder="Add a task and press Enter…"
        />
        <button className="proj-btn" onClick={addTask} disabled={!draft.trim()}>Add</button>
      </div>

      {tasks.length === 0 && (
        <div className="proj-empty"><p>No tasks yet.</p></div>
      )}

      {tasks.length > 0 && (
        <ul className="proj-task-list">
          {tasks.map((task) => (
            <li key={task.id} className={"proj-task-row" + (task.done ? " is-done" : "")}>
              <button
                className={"proj-checkbox" + (task.done ? " is-checked" : "")}
                onClick={() => toggleDone(task.id)}
                aria-label={task.done ? "Mark not done" : "Mark done"}
              >
                {task.done && <Icon name="folder" size={10} />}
              </button>
              {editingId === task.id ? (
                <input
                  autoFocus
                  className="proj-task-edit"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                    else if (e.key === "Escape") { setEditingId(null); setEditDraft(""); }
                  }}
                />
              ) : (
                <button className="proj-task-text" onClick={() => startEdit(task)}>
                  {task.text}
                </button>
              )}
              <button className="proj-icon-btn" title="Delete" onClick={() => deleteTask(task.id)}>
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
