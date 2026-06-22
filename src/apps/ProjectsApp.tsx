"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { loadProject } from "./projects/data";
import { ProjectDocs } from "./projects/ProjectDocs";
import { ProjectLinks } from "./projects/ProjectLinks";
import { ProjectOverview } from "./projects/ProjectOverview";
import { ProjectSidebar } from "./projects/ProjectSidebar";
import { ProjectTasks } from "./projects/ProjectTasks";
import type { ProjectData } from "./projects/types";

type TabId = "overview" | "docs" | "tasks" | "links";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "docs", label: "Docs" },
  { id: "tasks", label: "Tasks" },
  { id: "links", label: "Links" },
];

export function ProjectsApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!selectedId) { setData(null); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    loadProject(selectedId)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "load failed"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedId, version]);

  const reloadProject = () => setVersion((v) => v + 1);

  return (
    <div className="projects-app">
      <ProjectSidebar
        selectedId={selectedId}
        onSelect={(id) => { setSelectedId(id || null); setTab("overview"); }}
      />

      <main className="proj-main">
        {!selectedId && (
          <div className="proj-empty proj-empty-full">
            <Icon name="folder" size={48} />
            <h2>Pick a project</h2>
            <p>Select one from the sidebar — or create a new one.</p>
          </div>
        )}

        {selectedId && loading && (
          <div className="proj-empty proj-empty-full">Loading…</div>
        )}

        {selectedId && error && (
          <div className="proj-empty proj-empty-full">
            <p className="proj-error">{error}</p>
          </div>
        )}

        {selectedId && data && (
          <>
            <header className="proj-header">
              <div className="proj-header-row">
                <Icon name="code" size={18} />
                <h2 className="proj-name">{data.summary.name}</h2>
              </div>
              <nav className="proj-tabs">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    className={"proj-tab" + (tab === t.id ? " is-active" : "")}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </header>

            <div className="proj-content">
              {tab === "overview" && (
                <ProjectOverview
                  readmeId={data.readme?.id ?? null}
                  initialContent={data.readme?.content ?? ""}
                  onSaved={reloadProject}
                />
              )}
              {tab === "docs" && (
                <ProjectDocs docsFolderId={data.docsFolderId} />
              )}
              {tab === "tasks" && (
                <ProjectTasks
                  tasksFileId={data.tasks.id}
                  initialTasks={data.tasks.tasks}
                />
              )}
              {tab === "links" && (
                <ProjectLinks
                  linksFileId={data.links.id}
                  initialLinks={data.links.links}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
