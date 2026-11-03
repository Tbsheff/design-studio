import type { RunRequest } from "../../../shared/contracts.js";
import type { RunView } from "../../runState.js";

const POLISH_REQUEST: RunRequest = {
  level: "polish",
  mode: "edit",
  prompt:
    "Polish this design: run every check, fix what you find, keep the content and structure.",
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
