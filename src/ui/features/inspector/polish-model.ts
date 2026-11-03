import { copy } from "./copy.js";
import type { RunRequest, RunView } from "./deps.js";

const POLISH_REQUEST: RunRequest = {
  level: "polish",
  mode: "edit",
  prompt: copy.polishPrompt,
};

const canPolishRun = (run: RunView, headVersionId: string | null): boolean => {
  const { summary } = run;

  if (!summary || summary.status !== "completed" || !headVersionId) {
    return false;
  }

  if (summary.level === "polish") {
    return false;
  }

  return summary.versionId === headVersionId;
};

export { canPolishRun, POLISH_REQUEST };
