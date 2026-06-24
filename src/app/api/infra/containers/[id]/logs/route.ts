import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getContainerLogs } from "@/lib/docker";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const url = new URL(req.url);
  const tail = Math.min(2000, Math.max(10, Number(url.searchParams.get("tail") || 200)));
  try {
    const logs = await getContainerLogs(id, tail);
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json({
      error: "Failed to get logs",
      detail: e instanceof Error ? e.message : "unknown",
    }, { status: 500 });
  }
}
