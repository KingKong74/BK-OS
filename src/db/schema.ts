import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ─── Auth.js standard tables ───────────────────────────────

export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('password_hash'),
  isGuest: boolean('is_guest').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('session', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ─── bailey.os tables ──────────────────────────────────────

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  body: text('body').notNull(),
  color: text('color').default('yellow').notNull(),
  positionX: integer('position_x').default(0).notNull(),
  positionY: integer('position_y').default(0).notNull(),
  closed: boolean('closed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * File system. Every node is a file or folder. Folders nest via parentId.
 * The "root" folder for each user has parentId = null and a special name "/".
 *
 * - For files with text content (kind="doc", "code", "config"), the body lives
 *   in `textContent` directly.
 * - For files with binary content (kind="image", "video", "audio", "pdf",
 *   "binary"), the body is stored on disk under /data/blobs/<blobRef> and only
 *   the reference + size are kept here.
 * - For folders, both text and blob fields are null.
 *
 * Soft-deleted nodes have recycled=true and recycledAt set. The recycle bin
 * lists these; "permanently delete" removes the row + blob.
 */
export const fsNodes = pgTable(
  'fs_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'file' | 'folder'
    kind: text('kind').default('other').notNull(), // 'doc' | 'code' | 'config' | 'image' | 'video' | 'audio' | 'pdf' | 'sheet' | 'app' | 'binary' | 'other'
    textContent: text('text_content'),
    blobRef: text('blob_ref'), // filename under /data/blobs
    sizeBytes: integer('size_bytes').default(0).notNull(),
    properties: jsonb('properties'), // app-specific metadata
    isSystem: boolean('is_system').default(false).notNull(), // seeded folder, can't delete
    recycled: boolean('recycled').default(false).notNull(),
    recycledAt: timestamp('recycled_at'),
    /** original parent before recycle, so we can restore properly */
    recycledFromParentId: uuid('recycled_from_parent_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    parentIdx: index('fs_nodes_parent_idx').on(t.userId, t.parentId, t.recycled),
    nameIdx: index('fs_nodes_name_idx').on(t.userId, t.name),
    recycledIdx: index('fs_nodes_recycled_idx').on(t.userId, t.recycled),
  })
);

/**
 * Bookmarks for the Internet Explorer app. Curated web service shortcuts.
 */
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').default('General').notNull(),
  label: text('label').notNull(),
  url: text('url').notNull(),
  iconUrl: text('icon_url'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Type exports ──────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type FsNode = typeof fsNodes.$inferSelect;
export type NewFsNode = typeof fsNodes.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
