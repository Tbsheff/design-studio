import type { Direction, Project } from "@design-studio/contracts";

import { groupRun } from "./variations-layer-model.js";
import type { GroupRunMap } from "./variations-layer-model.js";
import { budgetFor } from "./variations-model.js";

interface BarStats {
  readonly anyRunning: boolean;
  readonly budgetTotal: number | null;
  readonly total: number;
}

const toBarStats = (
  project: Project,
  group: Direction[],
  runs: GroupRunMap
): BarStats => {
  const groupRuns = group.map((member) => groupRun(runs, member.id));

  const firstRun = Object.values(runs).find(
    (run) =>
      run.request?.variation &&
      group.some((member) => member.id === run.directionId)
  );

  const budget = budgetFor(
    project,
    firstRun?.request?.level ?? project.settings.defaultLevel,
    group.length
  );

  return {
    anyRunning: groupRuns.some((run) => run.running),
    budgetTotal: budget.total,
    total: groupRuns.reduce((sum, run) => sum + run.costUsd, 0),
  };
};

export { toBarStats };

export type { BarStats };
