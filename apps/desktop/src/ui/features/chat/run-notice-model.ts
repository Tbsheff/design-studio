import { formatUsd } from "../../domain/format.js";
import type { RunView } from "./run-state-model.js";

const toSpentText = (run: RunView): string => {
  if (run.summary) {
    return ` after ${formatUsd(run.summary.costUsd)}`;
  }

  return "";
};

export { toSpentText };
