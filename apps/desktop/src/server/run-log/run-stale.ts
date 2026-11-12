import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { RunSummary } from "@design-studio/contracts";

import { writeAtomic } from "../platform/atomic-write/index.js";
import { isRunSummary } from "./run-list.js";

const STALE_RUN_ERROR =
  "The run stopped because the app closed or the agent quit before the run finished.";

const JSON_INDENT = 2;

const toSettledRun = (
  summary: RunSummary,
  isLive: boolean,
  finishedAt: number | null
): RunSummary => {
  if (summary.status !== "running" || isLive) {
    return summary;
  }

  const end = Math.max(
    finishedAt ?? summary.finishedAt ?? summary.startedAt,
    summary.startedAt
  );

  return {
    ...summary,
    durationMs: end - summary.startedAt,
    error: summary.error ?? STALE_RUN_ERROR,
    finishedAt: end,
    status: "failed",
  };
};

const toNames = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

const toLastTouch = async (base: string): Promise<number | null> => {
  const times = await Promise.all(
    [`${base}.jsonl`, `${base}.json`].map(async (file) => {
      try {
        const info = await stat(file);

        return info.mtimeMs;
      } catch {
        return 0;
      }
    })
  );

  const latest = Math.max(...times);

  if (latest <= 0) {
    return null;
  }

  return Math.round(latest);
};

const toRunningSummary = async (file: string): Promise<RunSummary | null> => {
  try {
    const text = await readFile(file, "utf-8");

    if (!text.includes('"running"')) {
      return null;
    }

    const parsed: unknown = JSON.parse(text);

    if (isRunSummary(parsed) && parsed.status === "running") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};

const updateStaleRun = async (file: string): Promise<boolean> => {
  const summary = await toRunningSummary(file);

  if (summary === null) {
    return false;
  }

  const base = file.slice(0, -".json".length);
  const settled = toSettledRun(summary, false, await toLastTouch(base));

  await writeAtomic(file, `${JSON.stringify(settled, null, JSON_INDENT)}\n`);

  return true;
};

const isSummaryName = (name: string): boolean =>
  name.endsWith(".json") && !name.startsWith("session-");

const updateProjectRuns = async (runsDir: string): Promise<number> => {
  const all = await toNames(runsDir);
  const names = all.filter((name) => isSummaryName(name));

  const results = await Promise.all(
    names.map((name) => updateStaleRun(path.join(runsDir, name)))
  );

  return results.filter(Boolean).length;
};

const updateStaleRuns = async (projectsRoot: string): Promise<number> => {
  const projects = await toNames(projectsRoot);

  const counts = await Promise.all(
    projects.map((name) =>
      updateProjectRuns(path.join(projectsRoot, name, "runs"))
    )
  );

  return counts.reduce((total, count) => total + count, 0);
};

export { STALE_RUN_ERROR, toSettledRun, updateStaleRuns };
