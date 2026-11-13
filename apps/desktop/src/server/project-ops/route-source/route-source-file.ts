import { createHash } from "node:crypto";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { Effect, Schema } from "effect";

import {
  appRouterDir,
  listAppRoutes,
  matchRouteFile,
} from "../../app/index.js";
import {
  hasFile,
  readTextFile,
  toJsonFileReader,
} from "../../platform/local-file/index.js";
import { toLayoutCandidates } from "./engine/to-route-files.js";

const RECORD_FILE = path.join(".studio", "route-source.json");

const MAIN_DIRECTION = "main";

const RouteFileHashSchema = Schema.Struct({
  file: Schema.String,
  sha: Schema.String,
});

const RouteSourceEntrySchema = Schema.Struct({
  appProjectId: Schema.String,
  copiedAt: Schema.Number,
  files: Schema.Array(RouteFileHashSchema),
  frameId: Schema.String,
  page: Schema.String,
  routePath: Schema.String,
  viewport: Schema.NullOr(Schema.Number),
});

const RouteSourceRecordSchema = Schema.Struct({
  entries: Schema.Array(RouteSourceEntrySchema),
});

type RouteSourceEntry = typeof RouteSourceEntrySchema.Type;

type RouteSourceRecord = typeof RouteSourceRecordSchema.Type;

const readRecordFile = toJsonFileReader(RouteSourceRecordSchema);

const toRecordPath = (workTree: string): string =>
  path.join(workTree, RECORD_FILE);

const toPagePath = (page: string): string => page.replace(/^\/+/u, "");

const getRecord = Effect.fn("RouteSource.getRecord")(function* run(
  workTree: string
) {
  const record = yield* readRecordFile(toRecordPath(workTree));

  if (record === null) {
    const empty: RouteSourceRecord = { entries: [] };

    return empty;
  }

  return record;
});

const toEntryOf = (
  record: RouteSourceRecord,
  page: string
): RouteSourceEntry | null =>
  record.entries.find((entry) => entry.page === toPagePath(page)) ?? null;

const toDirection = (project: Project, directionId: string): Direction | null =>
  project.directions.find((direction) => direction.id === directionId) ?? null;

const toMainDirection = (project: Project): Direction | null =>
  toDirection(project, MAIN_DIRECTION) ?? project.directions[0] ?? null;

const hasPage = (workTree: string, page: string): Effect.Effect<boolean> =>
  hasFile(path.join(workTree, toPagePath(page)));

const toFileSha = Effect.fn("RouteSource.toFileSha")(function* run(
  workTree: string,
  file: string
) {
  const text = yield* readTextFile(path.join(workTree, file));

  if (text === null) {
    return null;
  }

  return createHash("sha256").update(text).digest("hex");
});

const toShaMap = Effect.fn("RouteSource.toShaMap")(function* run(
  workTree: string,
  files: readonly string[]
) {
  const shas = yield* Effect.all(
    files.map((file) => toFileSha(workTree, file))
  );

  return new Map(files.map((file, index) => [file, shas[index] ?? null]));
});

const toRouterDir = (workTree: string, appDir: string): string | null => {
  const routerDir = appRouterDir(path.join(workTree, appDir));

  if (routerDir === null) {
    return null;
  }

  return path.relative(workTree, routerDir).split(path.sep).join("/");
};

const toRouteFiles = Effect.fn("RouteSource.toRouteFiles")(function* run(
  workTree: string,
  appDir: string,
  routePath: string
) {
  const routes = yield* Effect.promise(() => listAppRoutes(workTree, appDir));
  const routeFile = matchRouteFile(routes, routePath);
  const routerDir = toRouterDir(workTree, appDir);

  if (routeFile === null || routerDir === null) {
    return [];
  }

  const candidates = toLayoutCandidates(routeFile, routerDir);

  const found = yield* Effect.all(
    candidates.map((file) => hasFile(path.join(workTree, file)))
  );

  const layouts = candidates.filter((_file, index) => found[index] === true);

  return [routeFile, ...layouts];
});

const toFileHashes = Effect.fn("RouteSource.toFileHashes")(function* run(
  workTree: string,
  files: readonly string[]
) {
  const shas = yield* toShaMap(workTree, files);

  return files.flatMap((file) => {
    const sha = shas.get(file) ?? null;

    if (sha === null) {
      return [];
    }

    return [{ file, sha }];
  });
});

export {
  getRecord,
  toRecordPath,
  hasPage,
  toDirection,
  toEntryOf,
  toFileHashes,
  toMainDirection,
  toPagePath,
  toRouteFiles,
  toShaMap,
};

export type { RouteSourceEntry, RouteSourceRecord };
