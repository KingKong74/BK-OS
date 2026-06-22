import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { restoreNode, permaDelete } from '@/lib/fs-server';

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const node = await restoreNode(session.user.id, id);
    return NextResponse.json({ node });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'restore failed' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    await permaDelete(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'perma delete failed' }, { status: 400 });
  }
}
