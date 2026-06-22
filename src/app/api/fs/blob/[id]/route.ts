import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNode, readBlob, writeBlob, createNode } from '@/lib/fs-server';

interface Ctx { params: Promise<{ id: string }> }

/**
 * GET /api/fs/blob/[id]
 * Returns the binary content of a file node.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const node = await getNode(session.user.id, id);
  if (!node || node.type !== 'file' || !node.blobRef) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const buf = await readBlob(node.blobRef);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': mimeForKind(node.kind),
      'Content-Length': String(buf.length),
      'Content-Disposition': `inline; filename="${encodeURIComponent(node.name)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

/**
 * POST /api/fs/blob/upload?parentId=...&name=...&kind=...
 * Body is raw binary. Creates a new file node and stores the blob on disk.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const url = new URL(req.url);
  const parentId = url.searchParams.get('parentId');
  const name = url.searchParams.get('name');
  const kind = url.searchParams.get('kind') ?? 'binary';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const arrayBuf = await req.arrayBuffer();
  if (arrayBuf.byteLength > 200 * 1024 * 1024) {
    return NextResponse.json({ error: 'file too large (>200MB)' }, { status: 413 });
  }
  const buf = Buffer.from(arrayBuf);
  const { blobRef, size } = await writeBlob(buf);

  try {
    const node = await createNode(userId, parentId === 'root' ? null : parentId, name, 'file', kind, {
      blobRef,
      sizeBytes: size,
    });
    return NextResponse.json({ node });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'upload failed' }, { status: 400 });
  }
}

function mimeForKind(kind: string): string {
  switch (kind) {
    case 'image': return 'image/*';
    case 'video': return 'video/*';
    case 'audio': return 'audio/*';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}
