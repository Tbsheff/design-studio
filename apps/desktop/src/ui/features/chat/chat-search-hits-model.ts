import type { RunStatus, RunSummary } from "@design-studio/contracts";

import { SEARCH_LIMIT } from "./run-history-model.js";

interface Hits {
  query: string;
  runs: RunSummary[];
  more: boolean;
  failed: boolean;
}

const STATUS_WORD: Record<RunStatus, string> = {
  budget_exceeded: "Limit reached",
  canceled: "Stopped",
  completed: "Done",
  failed: "Failed",
  running: "Running",
};

const runLabel = (run: RunSummary): string => {
  const prompt = run.request.prompt.replaceAll(/\s+/gu, " ").trim();

  return run.title || prompt || "Untitled run";
};

const countText = (hits: Hits | null, searching: boolean): string => {
  if (!hits || searching || hits.failed) {
    return "";
  }

  if (hits.more) {
    return `${SEARCH_LIMIT}+`;
  }

  return String(hits.runs.length);
};

export { STATUS_WORD, countText, runLabel };

export type { Hits };
