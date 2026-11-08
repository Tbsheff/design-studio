import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";

import { appRouterDir, listAppRoutes } from "../app/index.js";
import { parseModuleFile } from "../components/index.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { toMatchedParams, toRouteParamNames } from "./engine/index.js";
import type { ModuleFile } from "./engine/index.js";

interface SourceScope {
  readonly direction: Direction;
  readonly project: Project;
}

interface SourcePage {
  readonly ast: ModuleFile;
  readonly code: string;
  readonly file: string;
  readonly params: Readonly<Record<string, string>>;
  readonly relative: string;
  readonly route: string;
  readonly routerDir: string;
}

const LAYOUT_FILES = [
  "layout.tsx",
  "layout.jsx",
  "layout.ts",
  "layout.js",
] as const;

const KNOWN_ROUTES_MAX = 8;

const hasPath = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch {
    return false;
  }
};

const toRoute = (raw: string): string => {
  const parts = raw
    .trim()
    .split("/")
    .filter((part) => part !== "");

  return `/${parts.join("/")}`;
};

const hasLayout = async (folder: string): Promise<boolean> => {
  const found = await Promise.all(
    LAYOUT_FILES.map((name) => hasPath(path.join(folder, name)))
  );

  return found.some(Boolean);
};

const toParentFolder = async (
  routerDir: string,
  folder: string
): Promise<string> => {
  if (folder === routerDir || !folder.startsWith(routerDir)) {
    return routerDir;
  }

  if (await hasLayout(folder)) {
    return folder;
  }

  return toParentFolder(routerDir, path.dirname(folder));
};

const getMissingParams = (
  route: string,
  params: Readonly<Record<string, string>>
): readonly string[] =>
  toRouteParamNames(route).filter((name) => !(name in params));

const toKnownRoutes = (routes: readonly { readonly route: string }[]): string =>
  routes
    .slice(0, KNOWN_ROUTES_MAX)
    .map((item) => item.route)
    .join(", ");

interface RouteMatch {
  readonly found: { readonly file: string; readonly route: string };
  readonly params: Readonly<Record<string, string>>;
}

const toRouteMatch = (
  routes: readonly { readonly file: string; readonly route: string }[],
  requested: string
): RouteMatch | null => {
  for (const found of routes) {
    const matched = toMatchedParams(found.route, requested);

    if (matched !== null) {
      return { found, params: matched };
    }
  }

  return null;
};

const getSourcePage = async (
  scope: SourceScope,
  rawRoute: string,
  explicit: Readonly<Record<string, string>>
): Promise<SourcePage> => {
  const { direction, project } = scope;
  const appDir = project.app?.appDir ?? ".";
  const routerDir = appRouterDir(path.join(direction.workTree, appDir));

  if (routerDir === null) {
    throw new BadRequestError(
      "This project has no Next.js app router folder (app or src/app)."
    );
  }

  const requested = toRoute(rawRoute);
  const routes = await listAppRoutes(direction.workTree, appDir);
  const match = toRouteMatch(routes, requested);

  if (match === null) {
    throw new NotFoundError(
      `No page has the route ${requested}. Known routes: ${toKnownRoutes(routes)}. Write dynamic parts as [param], or give a real path.`
    );
  }

  const { found } = match;
  const { route } = found;
  const params = { ...match.params, ...explicit };
  const missing = getMissingParams(route, params);

  if (missing.length > 0) {
    throw new BadRequestError(
      `The route ${route} has route params. Give a value for ${missing.join(", ")} in params.`
    );
  }

  const file = path.join(direction.workTree, found.file);
  const code = await readFile(file, "utf-8");
  const ast = parseModuleFile(code, file);

  if (ast === null) {
    throw new BadRequestError(`The page ${found.file} did not parse.`);
  }

  const relative = found.file;

  return { ast, code, file, params, relative, route, routerDir };
};

export { getSourcePage, toParentFolder };

export type { SourcePage, SourceScope };
