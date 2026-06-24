import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getContainerStats } from "@/lib/docker";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const stats = await getContainerStats(id);
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({
      error: "Failed to get stats",
      detail: e instanceof Error ? e.message : "unknown",
    }, { status: 500 });
  }
}
