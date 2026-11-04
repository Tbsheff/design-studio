import type { AppRoute } from "../../shared/actions/_core/contracts.js";
import { listAppRoutes } from "../app/routes.js";
import type { StudioProjectStore } from "../store/projects.js";

const ROUTE_LIMIT_DEFAULT = 50;

const CURSOR_PATTERN = /^\d{1,6}$/u;

interface RouteListQuery {
  readonly cursor: string | null;
  readonly limit: number | null;
  readonly projectId: string;
  readonly query: string | null;
}

interface RouteList {
  readonly appDir: string;
  readonly framework: string;
  readonly nextCursor: string | null;
  readonly routes: readonly AppRoute[];
  readonly total: number;
}

const toOffset = (cursor: string | null): number => {
  if (cursor !== null && CURSOR_PATTERN.test(cursor)) {
    return Number(cursor);
  }

  return 0;
};

const toNextCursor = (next: number, total: number): string | null => {
  if (next < total) {
    return String(next);
  }

  return null;
};

const matchRoutes = (
  routes: readonly AppRoute[],
  query: string | null
): readonly AppRoute[] => {
  if (query === null || query === "") {
    return routes;
  }

  const needle = query.toLowerCase();

  return routes.filter((item) =>
    `${item.route} ${item.file} ${item.group ?? ""}`
      .toLowerCase()
      .includes(needle)
  );
};

const readRouteList = async (
  projects: StudioProjectStore,
  query: RouteListQuery
): Promise<RouteList> => {
  const project = await projects.get(query.projectId);

  if (!project.app) {
    throw new Error("this project is not an attached app");
  }

  const [main] = project.directions;

  if (!main) {
    throw new Error("project has no direction");
  }

  const found = matchRoutes(
    await listAppRoutes(main.workTree, project.app.appDir),
    query.query
  );

  const offset = toOffset(query.cursor);

  const next = offset + (query.limit ?? ROUTE_LIMIT_DEFAULT);

  const cursorAfter = toNextCursor(next, found.length);

  return {
    appDir: project.app.appDir,
    framework: project.app.framework,
    nextCursor: cursorAfter,
    routes: found.slice(offset, next),
    total: found.length,
  };
};

export { readRouteList };

export type { RouteList, RouteListQuery };
