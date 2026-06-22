import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listChildren, listRecycled, resolvePath, seedFileSystemForUser } from '@/lib/fs-server';

/**
 * GET /api/fs/list
 *
 * Query params:
 *   parentId — UUID of the folder to list, or "root" for top-level
 *   path     — alternative: comma-separated path segments to resolve first
 *   recycled — "true" to list recycle bin instead
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;

  // Make sure the file system is seeded for this user
  await seedFileSystemForUser(userId);

  const url = new URL(req.url);
  const recycled = url.searchParams.get('recycled') === 'true';
  if (recycled) {
    const rows = await listRecycled(userId);
    return NextResponse.json({ children: rows });
  }

  let parentId: string | null = null;
  const parentParam = url.searchParams.get('parentId');
  const pathParam = url.searchParams.get('path');

  if (pathParam && pathParam.length > 0) {
    const segs = pathParam.split('/').filter(Boolean);
    if (segs.length > 0) {
      const resolved = await resolvePath(userId, segs);
      if (!resolved?.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
      parentId = resolved.id;
    }
  } else if (parentParam && parentParam !== 'root') {
    parentId = parentParam;
  }

  const children = await listChildren(userId, parentId);
  return NextResponse.json({ children, parentId });
}
