import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDockerAvailable, listContainers, categorizeContainer, prettyName } from "@/lib/docker";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const avail = await isDockerAvailable();
  if (!avail.available) {
    return NextResponse.json({
      error: "Docker socket not available",
      detail: avail.error,
      hint: "Mount /var/run/docker.sock into the bailey-os container. See PHASE-4-MIGRATION.md.",
    }, { status: 503 });
  }

  try {
    const containers = await listContainers(true);
    const enriched = containers.map((c) => ({
      id: c.Id,
      name: prettyName(c.Names),
      image: c.Image,
      state: c.State,
      status: c.Status,
      createdAt: new Date(c.Created * 1000).toISOString(),
      category: categorizeContainer(c),
      labels: {
        service: c.Labels["com.docker.swarm.service.name"],
        task: c.Labels["com.docker.swarm.task.name"],
      },
      ports: c.Ports.filter((p) => p.PublicPort).map((p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`),
    }));
    return NextResponse.json({ containers: enriched, dockerVersion: avail.version });
  } catch (e) {
    return NextResponse.json({
      error: "Failed to list containers",
      detail: e instanceof Error ? e.message : "unknown",
    }, { status: 500 });
  }
}
