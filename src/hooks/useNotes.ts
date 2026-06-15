'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Note {
  id: string;
  userId: string;
  title: string | null;
  body: string;
  color: string;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export type NewNoteInput = {
  body: string;
  title?: string | null;
  color?: string;
  positionX?: number;
  positionY?: number;
};

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotes(data.notes ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNote = useCallback(
    async (input: NewNoteInput): Promise<Note | null> => {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { note } = await res.json();
        setNotes((prev) => [note, ...prev]);
        return note;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create note');
        return null;
      }
    },
    []
  );

  const updateNote = useCallback(
    async (id: string, changes: Partial<Note>): Promise<void> => {
      // Optimistic update
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...changes } : n))
      );

      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update note');
        // Revert by refetching
        refresh();
      }
    },
    [refresh]
  );

  const deleteNote = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic delete
      const previousNotes = notes;
      setNotes((prev) => prev.filter((n) => n.id !== id));

      try {
        const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete note');
        setNotes(previousNotes);
      }
    },
    [notes]
  );

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refresh,
  };
}
