-- Add the `closed` column to the existing notes table
-- Run this once before deploying the new code.
--
-- Command (from ~/stack on the server):
--   cat ~/migrations/add-closed-to-notes.sql | docker compose exec -T postgres psql -U baileyos -d bailey_os

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS closed BOOLEAN NOT NULL DEFAULT false;

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notes'
ORDER BY ordinal_position;
