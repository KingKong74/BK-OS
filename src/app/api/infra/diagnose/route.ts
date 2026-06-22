import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

interface DiagnoseBody {
  error: string;
  context?: string;
}

const SYSTEM_PROMPT = `You are an expert SRE and full-stack developer helping a homelab operator diagnose problems on their self-hosted BK-OS / bailey.os Next.js + Postgres + Docker Swarm stack.

The stack: Next.js 16 frontend (App Router), Postgres via drizzle-orm, Docker Swarm via Dokploy, Cloudflare Tunnel for ingress, Tailscale for private access. Common pain points include DNS resolution inside containers (Tailscale overriding /etc/resolv.conf), Docker Swarm service vs task name confusion in DATABASE_URLs, GitHub webhook delivery failing on branch mismatch, and Postgres connection password drift.

Given an error message, stack trace, or log excerpt, respond with:

1. A one-sentence summary of what's failing.
2. The most likely cause (be specific — name the file, command, env var, or container).
3. Concrete steps to verify and fix, in order. Use code blocks for commands.
4. Optional preventative measure to avoid the issue in future.

Be terse. Skip pleasantries. The operator is technical and time-pressed.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: DiagnoseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (!body.error || typeof body.error !== "string") {
    return NextResponse.json({ error: "error field required" }, { status: 400 });
  }
  if (body.error.length > 30_000) {
    return NextResponse.json({ error: "error text too long (>30k chars)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "AI diagnosis not configured",
      hint: "Set the ANTHROPIC_API_KEY env var in Dokploy → bailey-os service → Environment tab. Get a key at console.anthropic.com.",
    }, { status: 503 });
  }

  const userMessage = body.context
    ? `Context: ${body.context}\n\nError / stack trace:\n\n${body.error}`
    : `Error / stack trace:\n\n${body.error}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        error: `Anthropic API returned ${res.status}`,
        detail: text.slice(0, 500),
      }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((c: { type: string }) => c.type === "text")
      .map((c: { text: string }) => c.text)
      .join("\n");

    return NextResponse.json({
      diagnosis: text,
      tokensUsed: data.usage?.output_tokens ?? null,
    });
  } catch (e) {
    return NextResponse.json({
      error: "Failed to reach Anthropic API",
      detail: e instanceof Error ? e.message : "unknown",
    }, { status: 502 });
  }
}
