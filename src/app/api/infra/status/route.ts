import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gatherStatus, overallLevel } from "@/lib/infra";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const checks = await gatherStatus();
  return NextResponse.json({
    checks,
    overall: overallLevel(checks),
    timestamp: new Date().toISOString(),
  });
}
