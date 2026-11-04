import type { Stats } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { RunSummary } from "@design-studio/actions/_core/contracts";
import { runMatches } from "../../shared/rewind.js";
import { isNodeError } from "../platform/errors/index.js";

interface CachedRun {
  mtimeMs: number;
  size: number;
  summary: RunSummary | null;
}

interface RunListQuery {
  readonly before: number | null;
  readonly directionId: string | null;
  readonly isLight: boolean;
  readonly limit: number;
  readonly terms: string[];
}

interface RunPage {
  readonly items: RunSummary[];
  readonly next: string | null;
}

interface StampedFile {
  file: string;
  at: number;
}

const CACHE_MAX = 2000;
const LATEST_SCAN = 3;
const LIGHT_TEXT_MAX = 400;
const cache = new Map<string, CachedRun>();

const isRunSummary = (value: unknown): value is RunSummary => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record: Partial<RunSummary> = value;

  const keyed =
    typeof record.id === "string" && typeof record.status === "string";

  return keyed && typeof record.request === "object" && record.request !== null;
};

const parseRun = async (file: string): Promise<RunSummary | null> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));

    if (isRunSummary(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};

const statOrNull = async (file: string): Promise<Stats | null> => {
  try {
    return await stat(file);
  } catch {
    return null;
  }
};

const remember = (file: string, entry: CachedRun): void => {
  if (cache.size > CACHE_MAX) {
    cache.clear();
  }

  cache.set(file, entry);
};

const readRun = async (file: string): Promise<RunSummary | null> => {
  const info = await statOrNull(file);

  if (!info?.isFile()) {
    return null;
  }

  const known = cache.get(file);

  if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) {
    return known.summary;
  }

  const summary = await parseRun(file);

  remember(file, { mtimeMs: info.mtimeMs, size: info.size, summary });

  return summary;
};

const runFileNames = async (dir: string): Promise<string[] | null> => {
  try {
    const names = await readdir(dir);

    return names.filter(
      (name) => name.endsWith(".json") && !name.startsWith("session-")
    );
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
};

const isRun = (run: RunSummary | null): run is RunSummary => run !== null;

const newestFirst = (left: RunSummary, right: RunSummary): number =>
  right.startedAt - left.startedAt;

const readRuns = async (files: string[]): Promise<RunSummary[]> => {
  const runs = await Promise.all(files.map((file) => readRun(file)));

  return runs.filter((run) => isRun(run)).toSorted(newestFirst);
};

const listRunSummaries = async (dir: string): Promise<RunSummary[]> => {
  const names = await runFileNames(dir);

  if (!names) {
    return [];
  }

  return readRuns(names.map((name) => path.join(dir, name)));
};

const stampFile = async (file: string): Promise<StampedFile> => {
  const info = await statOrNull(file);

  return { at: info?.mtimeMs ?? 0, file };
};

const latestRunStatus = async (
  dir: string
): Promise<RunSummary["status"] | null> => {
  const names = await runFileNames(dir);

  if (!names) {
    return null;
  }

  const stamped = await Promise.all(
    names.map((name) => stampFile(path.join(dir, name)))
  );

  const newest = stamped
    .toSorted((left, right) => right.at - left.at)
    .slice(0, LATEST_SCAN);

  const runs = await readRuns(newest.map((item) => item.file));

  return runs.at(0)?.status ?? null;
};

const lightRun = (run: RunSummary): RunSummary => {
  const rest: RunSummary = { ...run };

  delete rest.parts;
  delete rest.todos;
  delete rest.loop;
  delete rest.designSystemCheck;
  delete rest.finalCheck;

  return {
    ...rest,
    finalText: run.finalText.slice(0, LIGHT_TEXT_MAX),
    toolCalls: [],
  };
};

const runPasses = (run: RunSummary, query: RunListQuery): boolean => {
  const { terms, directionId, before } = query;

  if (before !== null && run.startedAt >= before) {
    return false;
  }

  if (directionId !== null && run.directionId !== directionId) {
    return false;
  }

  return runMatches(terms, run.request.prompt ?? "", run.title);
};

const matchRuns = (all: RunSummary[], query: RunListQuery): RunSummary[] => {
  const { terms, directionId, before } = query;

  if (terms.length === 0 && directionId === null && before === null) {
    return all;
  }

  return all.filter((run) => runPasses(run, query));
};

const nextOf = (page: RunSummary[], after: RunSummary[]): string | null => {
  const last = page.at(-1);

  if (last && page.length < after.length) {
    return String(last.startedAt);
  }

  return null;
};

const pageRuns = (all: RunSummary[], query: RunListQuery): RunPage => {
  const after = matchRuns(all, query);
  const page = after.slice(0, query.limit);
  const next = nextOf(page, after);

  if (query.isLight) {
    return { items: page.map((run) => lightRun(run)), next };
  }

  return { items: page, next };
};

export { isRunSummary, latestRunStatus, listRunSummaries, pageRuns };

export type { RunListQuery, RunPage };
