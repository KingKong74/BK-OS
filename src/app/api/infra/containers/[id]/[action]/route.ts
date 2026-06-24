import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { restartContainer, startContainer, stopContainer } from "@/lib/docker";

interface Ctx { params: Promise<{ id: string; action: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, action } = await params;

  try {
    switch (action) {
      case "restart": await restartContainer(id); break;
      case "start": await startContainer(id); break;
      case "stop": await stopContainer(id); break;
      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true, action });
  } catch (e) {
    return NextResponse.json({
      error: `${action} failed`,
      detail: e instanceof Error ? e.message : "unknown",
    }, { status: 500 });
  }
}
