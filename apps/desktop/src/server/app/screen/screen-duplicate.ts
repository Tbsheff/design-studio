import type { Dirent } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AppRoute } from "@design-studio/contracts";

import { ConflictError, NotFoundError } from "../../platform/errors/index.js";
import { matchRouteFile } from "../routes.js";
import {
  isCopiedName,
  toFramePath,
  toRewrittenImports,
  toRoutePath,
} from "./engine/index.js";
import { toHtmlDuplicatePlan } from "./screen-html.js";
import { ROOT_GROUP } from "./screen-model.js";
import type {
  DuplicateScreenCommand,
  PlannedFile,
  ScreenScope,
  ScreenWritePlan,
} from "./screen-model.js";
import { getSavedParams } from "./screen-params.js";
import {
  toCanonicalRoute,
  toLastTitle,
  toRollbackRoot,
  toSegmentsOrThrow,
} from "./screen-plan.js";
import {
  getGroupPlacement,
  getRouterContext,
  isPathTaken,
  listEntries,
  toPosix,
} from "./screen-source.js";
import type { RouterContext } from "./screen-source.js";

interface CopyScope {
  readonly newFolder: string;
  readonly sourceFolder: string;
  readonly workTree: string;
}

const FILES_MAX = 200;

const KNOWN_ROUTES_MAX = 8;

const TEXT_FILE = /\.(?:tsx?|jsx?|mjs|cjs|css|json|md|mdx|svg|txt)$/u;

const CODE_FILE = /\.(?:tsx?|jsx?|mjs|cjs)$/u;

const GROUP_DIR = /^\([^.)][^)]*\)$/u;

const isCopiedFile = (entry: Dirent, isRoot: boolean): boolean =>
  entry.isFile() &&
  TEXT_FILE.test(entry.name) &&
  (!isRoot || isCopiedName(entry.name));

const isCopiedFolder = (entry: Dirent, isRoot: boolean): boolean =>
  entry.isDirectory() && (!isRoot || entry.name.startsWith("_"));

const listCopyFiles = async (
  folder: string,
  prefix: string,
  isRoot: boolean
): Promise<readonly string[]> => {
  const entries = await listEntries(folder);

  const files = entries.flatMap((entry) => {
    if (isCopiedFile(entry, isRoot)) {
      return [path.posix.join(prefix, entry.name)];
    }

    return [];
  });

  const folders = entries.filter((entry) => isCopiedFolder(entry, isRoot));

  const nested = await Promise.all(
    folders.map((entry) =>
      listCopyFiles(
        path.join(folder, entry.name),
        path.posix.join(prefix, entry.name),
        false
      )
    )
  );

  return [...files, ...nested.flat()];
};

const toSourceRoute = (
  routes: readonly AppRoute[],
  from: readonly string[]
): AppRoute => {
  const wanted = toRoutePath(from);
  const exact = routes.find((item) => item.route === wanted);
  const file = matchRouteFile(routes, wanted);
  const matched = routes.find((item) => item.file === file);
  const found = exact ?? matched ?? null;

  if (found === null) {
    const known = routes
      .slice(0, KNOWN_ROUTES_MAX)
      .map((item) => item.route)
      .join(", ");

    throw new NotFoundError(
      `No page has the route ${wanted}. Known routes: ${known}. Call list_routes for the routes.`
    );
  }

  return found;
};

const toSourceGroup = (context: RouterContext, sourceAbs: string): string => {
  const relative = toPosix(path.relative(context.routerDir, sourceAbs));
  const first = relative.split("/").at(0) ?? "";

  if (GROUP_DIR.test(first)) {
    return first;
  }

  return ROOT_GROUP;
};

const toCopiedFile = async (
  scope: CopyScope,
  name: string
): Promise<PlannedFile> => {
  const from = path.posix.join(scope.sourceFolder, name);
  const relative = path.posix.join(scope.newFolder, name);
  const text = await readFile(path.join(scope.workTree, from), "utf-8");

  if (!CODE_FILE.test(name)) {
    return { code: text, relative };
  }

  const code = toRewrittenImports(text, {
    fromDir: path.posix.dirname(from),
    sourceFolder: scope.sourceFolder,
    toDir: path.posix.dirname(relative),
  });

  return { code, relative };
};

const toDuplicatePlan = async (
  scope: ScreenScope,
  command: DuplicateScreenCommand
): Promise<ScreenWritePlan> => {
  if (!scope.project.app) {
    return toHtmlDuplicatePlan(scope, command);
  }

  const from = toSegmentsOrThrow(command.from);
  const segments = toSegmentsOrThrow(command.path);
  const context = await getRouterContext(scope);
  const source = toSourceRoute(context.routes, from);
  const sourceFolder = path.posix.dirname(source.file);
  const sourceAbs = path.join(context.workTree, sourceFolder);
  const group = toSourceGroup(context, sourceAbs);
  const placement = await getGroupPlacement(context, group, segments);

  if (await isPathTaken(context, segments, placement)) {
    throw new ConflictError(
      `The route ${toRoutePath(segments)} exists already. Pick another path.`
    );
  }

  const folder = path.join(placement.folder, ...placement.rest);
  const newFolder = toPosix(path.relative(context.workTree, folder));
  const names = await listCopyFiles(sourceAbs, "", true);

  if (names.length === 0 || names.length > FILES_MAX) {
    throw new NotFoundError(
      `The route ${source.route} has no page file to copy, or more than ${FILES_MAX} files.`
    );
  }

  const copyScope = { newFolder, sourceFolder, workTree: context.workTree };

  const [files, params] = await Promise.all([
    Promise.all(names.map((name) => toCopiedFile(copyScope, name))),
    getSavedParams(scope.projectDir),
  ]);

  return {
    files,
    framePath: toFramePath(segments, params),
    label: toLastTitle(segments),
    rightOfPath: toFramePath(from, params),
    rollbackRoot: toRollbackRoot(context.workTree, placement),
    route: toCanonicalRoute(context.routerDir, folder),
    versionTitle: `Duplicate screen ${source.route} to ${toRoutePath(segments)}`,
  };
};

export { toDuplicatePlan };
