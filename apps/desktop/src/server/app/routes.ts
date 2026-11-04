import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { AppRoute } from "../../shared/contracts.js";

const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;
const MAX_ROUTES = 2000;
const MAX_DEPTH = 24;

function isSkippedDir(name: string): boolean {
  return (
    name === "node_modules" ||
    name.startsWith(".") ||
    name.startsWith("_") ||
    name.startsWith("@") ||
    /^\(\.+\)/.test(name)
  );
}

function routeGroup(name: string): string | null {
  const match = /^\(([^.)][^)]*)\)$/.exec(name);

  return match?.[1] ?? null;
}

function appRouterDir(appRoot: string): string | null {
  for (const candidate of [
    path.join(appRoot, "app"),
    path.join(appRoot, "src", "app"),
  ]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function listAppRoutes(
  workTree: string,
  appDir: string
): Promise<AppRoute[]> {
  const appRoot = path.join(workTree, appDir);
  const routerDir = appRouterDir(appRoot);

  if (!routerDir) {
    return [];
  }

  const routes: AppRoute[] = [];

  const walk = async (
    dir: string,
    segments: string[],
    group: string | null,
    depth: number
  ): Promise<void> => {
    if (depth > MAX_DEPTH || routes.length >= MAX_ROUTES) {
      return;
    }

    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (entry.isFile() && PAGE_FILE.test(entry.name)) {
        const route = `/${segments.join("/")}`;
        routes.push({
          dynamic: segments.some((segment) => segment.startsWith("[")),
          file: path
            .relative(workTree, path.join(dir, entry.name))
            .split(path.sep)
            .join("/"),
          group,
          route,
        });
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || isSkippedDir(entry.name)) {
        continue;
      }

      const named = routeGroup(entry.name);
      await walk(
        path.join(dir, entry.name),
        named === null ? [...segments, entry.name] : segments,
        group ?? named,
        depth + 1
      );
    }
  };

  await walk(routerDir, [], null, 0);

  return routes.sort(
    (a, b) =>
      Number(a.dynamic) - Number(b.dynamic) || a.route.localeCompare(b.route)
  );
}

function segmentsOf(value: string): string[] {
  return value.split("/").filter(Boolean);
}

function segmentMatches(pattern: string[], actual: string[]): boolean {
  for (const [index, part] of pattern.entries()) {
    if (/^\[\[?\.\.\./.test(part)) {
      return part.startsWith("[[") || actual.length > index;
    }

    if (index >= actual.length) {
      return false;
    }

    if (!part.startsWith("[") && part !== actual[index]) {
      return false;
    }
  }

  return pattern.length === actual.length;
}

function matchRouteFile(
  routes: readonly AppRoute[],
  framePath: string
): string | null {
  const actual = segmentsOf(framePath.split("?")[0] ?? "");

  const exact = routes.find(
    (route) => segmentsOf(route.route).join("/") === actual.join("/")
  );

  if (exact) {
    return exact.file;
  }

  return (
    routes.find(
      (route) =>
        route.dynamic && segmentMatches(segmentsOf(route.route), actual)
    )?.file ?? null
  );
}

export { appRouterDir, listAppRoutes, matchRouteFile };
