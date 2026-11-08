import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { formatRelative } from "../../domain/format.js";
import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import { homePrefs } from "./home-prefs-model.js";
import type { HomeFilter } from "./home-prefs-model.js";
import { isFolderProject, projectBadge, useThumbnail } from "./project-grid.js";
import { listRecentRuns } from "./use-last-runs.js";

export { ProjectGrid } from "./project-grid.js";

export { PackCards } from "./home-popovers.js";

const FILTERS: { readonly id: HomeFilter; readonly label: string }[] = [
  { id: "all", label: "All" },
  { id: "prototypes", label: "Prototypes" },
  { id: "apps", label: "Apps" },
  { id: "systems", label: "Systems" },
];

export const FILTER_EMPTY: Record<HomeFilter, string> = {
  all: "projects",
  apps: "apps",
  prototypes: "prototypes",
  systems: "design systems",
};

function filterTest(filter: HomeFilter): (project: Project) => boolean {
  if (filter === "systems") {
    return (project) => Boolean(project.designSystemFor);
  }

  if (filter === "all") {
    return () => true;
  }

  return (project) =>
    !project.designSystemFor &&
    isFolderProject(project) === (filter === "apps");
}

export function filterLibrary(
  projects: Project[] | null,
  filter: HomeFilter
): Project[] | null {
  if (!projects) {
    return projects;
  }

  const test = filterTest(filter);

  return projects.filter(
    (project) => !project.designSystemDeleted && test(project)
  );
}

export const FilterChips = ({
  filter,
}: {
  readonly filter: HomeFilter;
}): ReactElement => (
  <div className="home-seg" role="tablist" aria-label={copy.show}>
    {FILTERS.map((item) => (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={filter === item.id}
        className={filter === item.id ? "on" : ""}
        onClick={() => homePrefs.set({ filter: item.id })}
      >
        {item.label}
      </button>
    ))}
  </div>
);

interface LastRun {
  readonly prompt: string;
  readonly route: string | null;
  readonly at: number;
}

function useLastRun(project: Project): LastRun | null {
  const [last, setLast] = useState<LastRun | null>(null);
  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const items = await listRecentRuns(project.id, 5);

        const run = [...items].sort(
          (first, second) => second.startedAt - first.startedAt
        )[0];

        if (live && run) {
          setLast({
            at: run.startedAt,
            prompt: run.request.prompt,
            route: run.request.canvas?.path ?? null,
          });
        }
      } catch {
        if (live) {
          setLast((previous) => previous);
        }
      }
    };

    load();

    return (): void => {
      live = false;
    };
  }, [project.id]);

  return last;
}

function routeLine(project: Project, last: LastRun | null): string {
  const dir =
    project.app?.appDir && project.app.appDir !== "."
      ? project.app.appDir
      : null;

  const route = last?.route ?? (project.app ? null : project.entry);

  return [dir, route].filter(Boolean).join(" · ");
}

const SERVER_TEXT: Partial<Record<AppHealth["state"], string>> = {
  building: "Dev server starting…",
  failed: "Dev server failed",
  install: "Needs install",
  ready: "Dev server ready",
};

export const ContinueCard = ({
  project,
  health,
  onOpen,
}: {
  readonly project: Project;
  readonly health: AppHealth | null;
  readonly onOpen: (project: Project) => void;
}): ReactElement => {
  const thumb = useThumbnail(project);
  const last = useLastRun(project);
  const badge = projectBadge(project);
  const line = routeLine(project, last);
  const server = project.app && health ? SERVER_TEXT[health.state] : undefined;

  return (
    <section className="home-continue" aria-label={copy.continue}>
      <button
        type="button"
        className="home-continue-thumb"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => onOpen(project)}
      >
        {thumb ? (
          <img src={thumb} alt="" draggable={false} />
        ) : (
          <Icon name={project.app ? "code" : "frame"} size={20} />
        )}
      </button>
      <div className="home-continue-body">
        <span className="home-continue-kicker">{copy.continue}</span>
        <div className="home-continue-title">
          <b className="truncate">{project.name}</b>
          <span className={`home-badge ${badge.tone}`}>{badge.label}</span>
          {line && (
            <span className="mono truncate home-continue-route">{line}</span>
          )}
        </div>
        <p className="home-continue-last truncate">
          {last
            ? `Last: “${last.prompt}” · ${formatRelative(last.at)}`
            : `Edited ${formatRelative(project.updatedAt).replace(/^Just/u, "just")}`}
        </p>
        <div className="home-continue-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => onOpen(project)}
          >
            {copy.resume}
            <Icon name="arrowRight" size={14} />
          </button>
          {server && health && (
            <span className={`project-health ${health.state}`}>
              <span className="project-dot" aria-hidden="true" />
              {server}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
