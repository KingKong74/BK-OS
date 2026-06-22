import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createNode } from '@/lib/fs-server';

interface Body {
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  kind?: string;
  textContent?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (!body?.name || typeof body.name !== 'string' || body.name.length > 200) {
    return NextResponse.json({ error: 'name required (≤200 chars)' }, { status: 400 });
  }
  if (body.type !== 'file' && body.type !== 'folder') {
    return NextResponse.json({ error: 'type must be file|folder' }, { status: 400 });
  }
  if (body.name.includes('/') || body.name.includes('\\')) {
    return NextResponse.json({ error: 'name cannot contain slashes' }, { status: 400 });
  }

  try {
    const node = await createNode(userId, body.parentId ?? null, body.name, body.type, body.kind ?? 'other', {
      textContent: body.textContent,
    });
    return NextResponse.json({ node });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'create failed' }, { status: 400 });
  }
}
