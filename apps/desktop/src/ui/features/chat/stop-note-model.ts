import { baseName } from "../../domain/format.js";
import type { RunView } from "./run-state-model.js";

const stopNote = (run: RunView): string | null => {
  const { summary } = run;

  if (!summary || run.status === "running" || run.status === "completed") {
    return null;
  }

  const restored = (summary.restoredFiles ?? []).map((file) => baseName(file));
  const parts: string[] = [];

  if (restored.length > 0) {
    parts.push(`Put back ${restored.join(", ")}: the write was cut off.`);
  }

  if (summary.versionId) {
    parts.push("Saved what it changed as a version.");
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" ");
};

export { stopNote };
