import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gatherStatus, gatherSystemOverview, overallLevel } from "@/lib/infra";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [checks, system] = await Promise.all([gatherStatus(), gatherSystemOverview()]);
  return NextResponse.json({
    checks,
    system,
    overall: overallLevel(checks),
    timestamp: new Date().toISOString(),
  });
}
