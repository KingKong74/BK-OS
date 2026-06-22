-- BK-OS Phase 1 migration
-- Adds: fs_nodes (server file system), bookmarks (Internet Explorer app),
--       is_guest flag on users (for public demo mode)

-- 1. Add is_guest to user table (idempotent)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_guest" BOOLEAN NOT NULL DEFAULT false;

-- 2. Create fs_nodes
CREATE TABLE IF NOT EXISTS "fs_nodes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "parent_id" UUID,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'other',
  "text_content" TEXT,
  "blob_ref" TEXT,
  "size_bytes" INTEGER NOT NULL DEFAULT 0,
  "properties" JSONB,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "recycled" BOOLEAN NOT NULL DEFAULT false,
  "recycled_at" TIMESTAMP,
  "recycled_from_parent_id" UUID,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "fs_nodes_parent_idx" ON "fs_nodes"("user_id", "parent_id", "recycled");
CREATE INDEX IF NOT EXISTS "fs_nodes_name_idx" ON "fs_nodes"("user_id", "name");
CREATE INDEX IF NOT EXISTS "fs_nodes_recycled_idx" ON "fs_nodes"("user_id", "recycled");

-- 3. Create bookmarks
CREATE TABLE IF NOT EXISTS "bookmarks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL DEFAULT 'General',
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "icon_url" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT now()
);
