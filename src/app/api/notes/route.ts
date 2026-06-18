import { auth } from '@/auth';
import { db } from '@/db';
import { notes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, session.user.id))
    .orderBy(asc(notes.createdAt));

  return NextResponse.json({ notes: userNotes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const [note] = await db
      .insert(notes)
      .values({
        // Use client-supplied UUID if present (lets the optimistic update keep
        // the same id locally and remotely without a swap)
        ...(body.id ? { id: body.id } : {}),
        userId: session.user.id,
        title: body.title ?? null,
        body: body.body ?? '',
        color: body.color ?? 'yellow',
        positionX: body.positionX ?? 0,
        positionY: body.positionY ?? 0,
        closed: body.closed ?? false,
      })
      .returning();

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
