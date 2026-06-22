import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { searchByName } from '@/lib/fs-server';
import { db, notes } from '@/db';
import { and, eq, sql } from 'drizzle-orm';

/**
 * GET /api/search?q=...
 * Returns grouped matches: files (name match), notes (body or title match).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ files: [], notes: [] });

  const files = await searchByName(userId, q, 20);

  const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
  const noteRows = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        sql`(LOWER(COALESCE(${notes.title}, '')) LIKE LOWER(${pattern}) OR LOWER(${notes.body}) LIKE LOWER(${pattern}))`
      )
    )
    .limit(15);

  return NextResponse.json({
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      kind: f.kind,
      parentId: f.parentId,
    })),
    notes: noteRows.map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.body.slice(0, 120),
    })),
  });
}
