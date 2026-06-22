import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNode, renameNode, moveNode, updateTextContent, recycleNode } from '@/lib/fs-server';

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const node = await getNode(session.user.id, id);
  if (!node) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ node });
}

interface PatchBody {
  name?: string;
  parentId?: string | null;
  textContent?: string;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  let body: PatchBody;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  try {
    let node = await getNode(userId, id);
    if (!node) return NextResponse.json({ error: 'not found' }, { status: 404 });

    if (body.name !== undefined && body.name !== node.name) {
      node = await renameNode(userId, id, body.name);
    }
    if (body.parentId !== undefined && body.parentId !== node.parentId) {
      node = await moveNode(userId, id, body.parentId);
    }
    if (body.textContent !== undefined && node.type === 'file') {
      node = await updateTextContent(userId, id, body.textContent);
    }
    return NextResponse.json({ node });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'patch failed' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    await recycleNode(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'delete failed' }, { status: 400 });
  }
}
