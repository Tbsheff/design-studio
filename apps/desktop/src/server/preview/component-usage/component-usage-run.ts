import path from "node:path";

import type { Effect } from "effect";

import {
  componentUsage,
  loadLibrary,
  runDirectionRead,
  toDirectEditStatusFailure,
  toImportEdges,
  toImportStamp,
} from "./deps.js";
import type {
  BoundedCache,
  DirectionRun,
  KnownFailure,
  Project,
} from "./deps.js";
import { toComponentUses } from "./engine/index.js";
import type { ComponentUse, UsageComponent } from "./engine/index.js";
import { listSourceFiles, getMissingTexts } from "./usage-files.js";

interface ListComponentUsageCommand {
  readonly cursor: string | null;
  readonly directionId: string | null;
  readonly isUnusedOnly: boolean;
  readonly limit: number;
  readonly projectId: string;
}

interface ComponentUsagePage {
  readonly componentCount: number;
  readonly items: readonly ComponentUse[];
  readonly next: string | null;
  readonly unusedCount: number;
}

type UsageCache = BoundedCache<string, readonly ComponentUse[]>;

type Library = Awaited<ReturnType<typeof loadLibrary>>;

const MAIN_DIRECTION = "main";

const MAX_COMPONENTS = 300;

const toOffset = (cursor: string | null): number => {
  const offset = Number(cursor ?? "0");

  if (Number.isInteger(offset) && offset >= 0) {
    return offset;
  }

  return 0;
};

const toUsageComponents = (library: Library): UsageComponent[] =>
  library.entries.slice(0, MAX_COMPONENTS).map((entry) => ({
    absolute: entry.absolute,
    file: entry.file,
    isDefault: entry.kind === "default",
    name: entry.name,
  }));

const toRouteCount = async (
  project: Project,
  root: string,
  component: UsageComponent
): Promise<number> => {
  try {
    const usage = await componentUsage(project, root, component.file);

    return usage.routes.length;
  } catch {
    return 0;
  }
};

const toRouteCounts = async (
  project: Project,
  root: string,
  components: readonly UsageComponent[]
): Promise<Map<string, number>> => {
  const files = new Map(
    components.map((component) => [component.absolute, component])
  );

  const counts = await Promise.all(
    [...files.values()].map(async (component) => [
      component.absolute,
      await toRouteCount(project, root, component),
    ])
  );

  return new Map(counts as [string, number][]);
};

const toComponentUseList = async (
  project: Project,
  library: Library,
  roots: string[]
): Promise<ComponentUse[]> => {
  const { root } = library;
  const components = toUsageComponents(library);
  const edges = await toImportEdges(root, roots);

  const sourceFiles: string[] = [];

  for (const [file] of edges) {
    if (file.startsWith(root + path.sep)) {
      sourceFiles.push(file);
    }
  }

  const [texts, routeCounts] = await Promise.all([
    getMissingTexts(library.texts, sourceFiles),
    toRouteCounts(project, root, components),
  ]);

  const relativeOf = (absolute: string): string =>
    path.relative(root, absolute).split(path.sep).join("/");

  return toComponentUses({
    components,
    edges,
    relativeOf,
    routeCounts,
    texts,
  });
};

const toCachedUses = async (
  cache: UsageCache,
  project: Project,
  library: Library
): Promise<readonly ComponentUse[]> => {
  const roots = await listSourceFiles(library.scan);
  const stamp = await toImportStamp(library.root, roots);
  const key = `${library.root}|${project.id}|${stamp?.key ?? ""}`;
  const known = cache.get(key);

  if (known !== null && stamp !== null) {
    return known;
  }

  const uses = await toComponentUseList(project, library, roots);

  if (stamp !== null) {
    cache.set(key, uses);
  }

  return uses;
};

const runList = async (
  cache: UsageCache,
  run: DirectionRun,
  command: ListComponentUsageCommand
): Promise<ComponentUsagePage> => {
  let uses: readonly ComponentUse[] = [];

  if (run.project.kind === "react") {
    const library = await loadLibrary(run.project, run.direction.workTree);

    uses = await toCachedUses(cache, run.project, library);
  }

  const unused = uses.filter((use) => use.importCount === 0);
  let shown = uses;

  if (command.isUnusedOnly) {
    shown = unused;
  }

  const offset = toOffset(command.cursor);
  const end = offset + command.limit;
  let next: string | null = null;

  if (end < shown.length) {
    next = String(end);
  }

  const items = shown.slice(offset, end);
  const componentCount = uses.length;
  const unusedCount = unused.length;

  return { componentCount, items, next, unusedCount };
};

const runComponentUsageList = (
  cache: UsageCache,
  command: ListComponentUsageCommand
): Effect.Effect<ComponentUsagePage, KnownFailure> =>
  runDirectionRead(
    {
      directionId: command.directionId ?? MAIN_DIRECTION,
      projectId: command.projectId,
    },
    (run) => runList(cache, run, command),
    toDirectEditStatusFailure
  );

export { runComponentUsageList };

export type { ComponentUsagePage, ListComponentUsageCommand, UsageCache };
