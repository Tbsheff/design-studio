import type { Dirent } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { AppRoute } from "@design-studio/contracts";

import { BadRequestError } from "../../platform/errors/index.js";
import { appRouterDir, listAppRoutes } from "../routes.js";
import {
  isAuthRequiredFor,
  isDynamicSegment,
  isSameRoute,
  toRouteSegments,
  toShellComponents,
  toSharedPrefix,
} from "./engine/index.js";
import { ROOT_GROUP } from "./screen-model.js";
import type { InspectScope, LayoutGroupInfo } from "./screen-model.js";

interface RouterContext {
  readonly appRoot: string;
  readonly routerDir: string;
  readonly routes: readonly AppRoute[];
  readonly workTree: string;
}

interface Placement {
  readonly folder: string;
  readonly rest: readonly string[];
}

interface GroupScan {
  readonly context: RouterContext;
  readonly groups: readonly LayoutGroupInfo[];
  readonly samples: ReadonlyMap<string, readonly AppRoute[]>;
}

const GROUP_DIR = /^\((?<name>[^.)][^)]*)\)$/u;

const LAYOUT_FILES = [
  "layout.tsx",
  "layout.jsx",
  "layout.ts",
  "layout.js",
] as const;

const GUARD_FILES = [
  "proxy.ts",
  "proxy.js",
  "middleware.ts",
  "middleware.js",
] as const;

const PAGE_NAMES = ["tsx", "ts", "jsx", "js", "mdx"] as const;

const SAMPLES_MAX = 3;

const hasPath = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch {
    return false;
  }
};

const getFirstFile = async (
  folder: string,
  names: readonly string[]
): Promise<string | null> => {
  const found = await Promise.all(
    names.map(async (name) => {
      if (await hasPath(path.join(folder, name))) {
        return name;
      }

      return null;
    })
  );

  return found.find((name) => name !== null) ?? null;
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

const getRouterContext = async (
  scope: InspectScope
): Promise<RouterContext> => {
  const appDir = scope.project.app?.appDir ?? ".";
  const { workTree } = scope.direction;
  const appRoot = path.join(workTree, appDir);
  const routerDir = appRouterDir(appRoot);

  if (routerDir === null) {
    throw new BadRequestError(
      "This project has no Next.js app router folder (app or src/app)."
    );
  }

  const routes = await listAppRoutes(workTree, appDir);

  return { appRoot, routerDir, routes, workTree };
};

const listEntries = async (folder: string): Promise<readonly Dirent[]> => {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch {
    return [];
  }
};

const listChildFolders = async (folder: string): Promise<readonly string[]> => {
  const entries = await listEntries(folder);

  const names = entries.flatMap((entry) => {
    if (entry.isDirectory()) {
      return [entry.name];
    }

    return [];
  });

  return names.toSorted();
};

const listGroupNames = async (
  context: RouterContext
): Promise<readonly string[]> => {
  const folders = await listChildFolders(context.routerDir);

  return [...folders.filter((name) => GROUP_DIR.test(name)), ROOT_GROUP];
};

const getGroupFolder = (context: RouterContext, name: string): string => {
  if (name === ROOT_GROUP) {
    return context.routerDir;
  }

  return path.join(context.routerDir, name);
};

const toDynamicName = (
  folders: readonly string[],
  segment: string,
  isLast: boolean
): string | null => {
  if (isLast && !isDynamicSegment(segment)) {
    return null;
  }

  return (
    folders.find((name) => isDynamicSegment(name) && !name.includes("...")) ??
    null
  );
};

const getPlacement = async (
  folder: string,
  segments: readonly string[],
  isGroupEntered: boolean
): Promise<Placement> => {
  const head = segments.at(0) ?? null;
  const tail = segments.slice(1);

  if (head === null) {
    return { folder, rest: [] };
  }

  const folders = await listChildFolders(folder);

  if (folders.includes(head)) {
    return getPlacement(path.join(folder, head), tail, true);
  }

  let groups: readonly string[] = [];

  if (isGroupEntered) {
    groups = folders.filter((name) => GROUP_DIR.test(name));
  }

  const inner = await Promise.all(
    groups.map((name) => getPlacement(path.join(folder, name), segments, true))
  );

  const grouped =
    inner.find((item) => item.rest.length < segments.length) ?? null;

  if (grouped !== null) {
    return grouped;
  }

  const dynamic = toDynamicName(folders, head, tail.length === 0);

  if (dynamic !== null) {
    return getPlacement(path.join(folder, dynamic), tail, true);
  }

  return { folder, rest: segments };
};

const getGroupPlacement = (
  context: RouterContext,
  group: string,
  segments: readonly string[]
): Promise<Placement> =>
  getPlacement(getGroupFolder(context, group), segments, group !== ROOT_GROUP);

const getPageFile = (folder: string): Promise<string | null> => {
  const names = PAGE_NAMES.map((extension) => `page.${extension}`);

  return getFirstFile(folder, names);
};

const isPathTaken = async (
  context: RouterContext,
  segments: readonly string[],
  placement: Placement
): Promise<boolean> => {
  const isRoute = context.routes.some((item) =>
    isSameRoute(toRouteSegments(item.route), segments)
  );

  if (isRoute) {
    return true;
  }

  if (placement.rest.length > 0) {
    return false;
  }

  return (await getPageFile(placement.folder)) !== null;
};

const getGuardIn = async (folder: string): Promise<string | null> => {
  const name = await getFirstFile(folder, GUARD_FILES);

  if (name === null) {
    return null;
  }

  return readFile(path.join(folder, name), "utf-8");
};

const getGuardCode = async (appRoot: string): Promise<string | null> => {
  const found = await Promise.all([
    getGuardIn(appRoot),
    getGuardIn(path.join(appRoot, "src")),
  ]);

  return found.find((code) => code !== null) ?? null;
};

const toSampleOrder =
  (
    requested: readonly string[]
  ): ((left: AppRoute, right: AppRoute) => number) =>
  (left, right) => {
    const leftScore = toSharedPrefix(toRouteSegments(left.route), requested);
    const rightScore = toSharedPrefix(toRouteSegments(right.route), requested);

    return (
      rightScore - leftScore ||
      Number(left.dynamic) - Number(right.dynamic) ||
      left.route.localeCompare(right.route)
    );
  };

const toGroupLabel = (name: string): string | null => {
  if (name === ROOT_GROUP) {
    return null;
  }

  return name.slice(1, -1);
};

const toGroupRouteCount = (context: RouterContext, name: string): number => {
  const label = toGroupLabel(name);

  return context.routes.filter((item) => item.group === label).length;
};

const listGroupSamples = (
  context: RouterContext,
  name: string,
  requested: readonly string[]
): readonly AppRoute[] => {
  const label = toGroupLabel(name);

  return context.routes
    .filter((item) => item.group === label)
    .toSorted(toSampleOrder(requested))
    .slice(0, SAMPLES_MAX);
};

const getLayoutCode = async (
  folder: string
): Promise<{ readonly code: string; readonly name: string } | null> => {
  const name = await getFirstFile(folder, LAYOUT_FILES);

  if (name === null) {
    return null;
  }

  return { code: await readFile(path.join(folder, name), "utf-8"), name };
};

const getGroupInfo = async (
  context: RouterContext,
  name: string,
  inputs: {
    readonly guard: string | null;
    readonly samples: readonly AppRoute[];
  }
): Promise<LayoutGroupInfo> => {
  const folder = getGroupFolder(context, name);
  const layout = await getLayoutCode(folder);
  let layoutFile: string | null = null;
  let shellComponents: readonly string[] = [];

  if (layout !== null) {
    layoutFile = toPosix(
      path.relative(context.workTree, path.join(folder, layout.name))
    );
    shellComponents = toShellComponents(layout.code);
  }

  const isAuthRequired = isAuthRequiredFor(inputs.guard, name);
  const sampleRoutes = inputs.samples.map((item) => item.route);

  return { isAuthRequired, layoutFile, name, sampleRoutes, shellComponents };
};

const listLayoutGroups = async (
  scope: InspectScope,
  requested: readonly string[]
): Promise<GroupScan> => {
  const context = await getRouterContext(scope);

  const [names, guard] = await Promise.all([
    listGroupNames(context),
    getGuardCode(context.appRoot),
  ]);

  const sampled = names.map(
    (name) => [name, listGroupSamples(context, name, requested)] as const
  );

  const groups = await Promise.all(
    sampled.map(([name, samples]) =>
      getGroupInfo(context, name, { guard, samples })
    )
  );

  const samples = new Map(sampled);

  return { context, groups, samples };
};

export {
  getGroupFolder,
  getGroupPlacement,
  getPageFile,
  getRouterContext,
  hasPath,
  isPathTaken,
  listEntries,
  listLayoutGroups,
  toGroupRouteCount,
  toPosix,
};

export type { GroupScan, Placement, RouterContext };
