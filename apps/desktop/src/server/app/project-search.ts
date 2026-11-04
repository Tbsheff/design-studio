import { existsSync } from "node:fs";
import path from "node:path";

import type { AppServerStatus, Project } from "../../shared/actions/_core/contracts.js";
import { fuzzyScore } from "../../shared/fuzzy.js";
import { projectTypeOf, TYPE_LABELS } from "../../shared/project-search.js";
import type {
  ProjectHealth,
  ProjectHit,
  ProjectSearchResult,
  RouteHit,
} from "../../shared/project-search.js";
import { latestRunStatus } from "../run-log/index.js";
import { listAppRoutes } from "./routes.js";

export interface ProjectSearchDeps {
  projects: { list: () => Promise<Project[]> };
  appStatus?: (project: Project) => AppServerStatus | null;
  runsDir?: (projectId: string) => string;
}

export interface ProjectSearchInput {
  query?: string;
  projectId?: string | null;
  limit?: number;
}

const ROUTE_TTL_MS = 15_000;
const ROUTE_APPS = 3;
const ROUTE_LIMIT = 8;

const routeCache = new Map<
  string,
  { at: number; routes: Promise<RouteHit[]> }
>();

const runCache = new Map<
  string,
  { key: number; at: number; failed: Promise<boolean> }
>();

const RUN_FAILED: ProjectHealth = { level: "failed", note: "Last run failed" };

function recency(project: Project): number {
  return project.openedAt ?? project.updatedAt;
}

function hasInstall(workTree: string, appDir: string): boolean {
  return (
    existsSync(path.join(workTree, appDir, "node_modules")) ||
    existsSync(path.join(workTree, "node_modules"))
  );
}

function serverHealth(status: AppServerStatus): ProjectHealth {
  const cause = status.doctor?.causes.find((item) => item.severity === "error");

  if (status.state === "failed") {
    return {
      level: "warn",
      note: cause?.title ?? status.message ?? "Dev server failed",
    };
  }

  if (cause) {
    return { level: "warn", note: cause.title };
  }

  if (status.state === "ready") {
    return { level: "ok", note: "Dev server ready" };
  }

  if (status.state === "starting") {
    return { level: "busy", note: "Dev server starting" };
  }

  return { level: "off", note: "Dev server not running" };
}

export function projectHealth(
  project: Project,
  status: AppServerStatus | null,
  runFailed = false
): ProjectHealth | null {
  const folder = project.imported?.sourcePath;

  if (folder && !project.imported?.created && !existsSync(folder)) {
    return { level: "warn", note: "Folder not found" };
  }

  if (!project.app) {
    return runFailed ? RUN_FAILED : null;
  }

  const main = project.directions[0];

  if (
    main &&
    project.app.mode === "managed" &&
    !hasInstall(main.workTree, project.app.appDir)
  ) {
    return { level: "warn", note: "Needs install" };
  }

  const server = status
    ? serverHealth(status)
    : { level: "off" as const, note: "Dev server not running" };

  return runFailed && server.level !== "warn" ? RUN_FAILED : server;
}

function lastRunFailed(
  project: Project,
  deps: ProjectSearchDeps
): Promise<boolean> {
  if (!deps.runsDir) {
    return Promise.resolve(false);
  }

  const cached = runCache.get(project.id);

  if (
    cached &&
    cached.key === project.updatedAt &&
    Date.now() - cached.at < ROUTE_TTL_MS
  ) {
    return cached.failed;
  }

  const failed = latestRunStatus(deps.runsDir(project.id)).then(
    (status) => status === "failed",
    () => false
  );

  runCache.set(project.id, { at: Date.now(), failed, key: project.updatedAt });

  return failed;
}

function placeOf(project: Project): string | null {
  const appDir = project.app?.appDir ?? "";

  if (appDir && appDir !== ".") {
    return appDir;
  }

  const folder =
    project.imported && !project.imported.created
      ? project.imported.sourcePath
      : null;

  return folder ? folder.replace(/^\/(Users|home)\/[^/]+/, "~") : null;
}

async function hitOf(
  project: Project,
  deps: ProjectSearchDeps
): Promise<ProjectHit> {
  const type = projectTypeOf(project);

  return {
    health: projectHealth(
      project,
      project.app ? (deps.appStatus?.(project) ?? null) : null,
      await lastRunFailed(project, deps)
    ),
    id: project.id,
    name: project.name,
    openedAt: project.openedAt ?? null,
    place: placeOf(project),
    thumbnail: project.thumbnail?.versionId ?? null,
    type,
    typeLabel: TYPE_LABELS[type],
    updatedAt: project.updatedAt,
  };
}

function appRoutes(project: Project): Promise<RouteHit[]> {
  const cached = routeCache.get(project.id);

  if (cached && Date.now() - cached.at < ROUTE_TTL_MS) {
    return cached.routes;
  }

  const main = project.directions[0];

  const routes =
    main && project.app
      ? listAppRoutes(main.workTree, project.app.appDir).then((list) =>
          list.map((r) => ({
            dynamic: r.dynamic,
            file: r.file,
            projectId: project.id,
            projectName: project.name,
            route: r.route,
          }))
        )
      : Promise.resolve([]);

  routeCache.set(project.id, {
    at: Date.now(),
    routes: routes.catch(() => []),
  });

  return routes.catch(() => []);
}

function matchRoutes(routes: RouteHit[], query: string): RouteHit[] {
  if (!query) {
    return routes.slice(0, ROUTE_LIMIT);
  }

  const scored = routes
    .map((route) => ({
      route,
      score: fuzzyScore(`${route.route} ${route.file}`, query),
    }))
    .filter((r): r is { route: RouteHit; score: number } => r.score !== null);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, ROUTE_LIMIT)
    .map((r) => r.route);
}

function routesFor(
  routes: RouteHit[],
  query: string,
  nameHit: boolean
): RouteHit[] {
  const found = matchRoutes(routes, query);

  return found.length > 0 || !nameHit ? found : routes.slice(0, 4);
}

function routeSources(
  all: Project[],
  matched: Project[],
  projectId: string | null | undefined,
  query: string
): Project[] {
  const current = projectId
    ? all.find((p) => p.id === projectId && p.app)
    : undefined;

  const apps = query ? matched.filter((p) => p.app) : [];
  const fallback = query.startsWith("/") ? all.filter((p) => p.app) : [];

  const list = [current, ...apps, ...fallback].filter(
    (p): p is Project => p !== undefined
  );

  return list
    .filter((p, i) => list.findIndex((x) => x.id === p.id) === i)
    .slice(0, ROUTE_APPS);
}

export async function searchProjects(
  deps: ProjectSearchDeps,
  input: ProjectSearchInput = {}
): Promise<ProjectSearchResult> {
  const query = (input.query ?? "").trim().slice(0, 100);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const all = (await deps.projects.list())
    .filter((p) => !p.designSystemDeleted)
    .sort((a, b) => recency(b) - recency(a));

  const matched = query
    ? all
        .map((p) => ({
          p,
          score: fuzzyScore(`${p.name} ${p.app?.appDir ?? ""}`, query),
        }))
        .filter((r) => r.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((r) => r.p)
    : all;

  const sources = routeSources(all, matched, input.projectId, query);
  const routeQuery = query.replace(/^\//, "");
  const named = new Set(query ? matched.map((p) => p.id) : []);

  const routes = (
    await Promise.all(
      sources.map(async (p) =>
        routesFor(await appRoutes(p), routeQuery, named.has(p.id))
      )
    )
  ).flat();

  return {
    projects: await Promise.all(
      matched.slice(0, limit).map((p) => hitOf(p, deps))
    ),
    query,
    routes,
  };
}
