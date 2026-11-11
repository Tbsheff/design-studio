import type { Direction } from "@design-studio/contracts";

import { groupRun } from "./variations-layer-model.js";
import type { GroupRunMap } from "./variations-layer-model.js";

interface BarStats {
  readonly anyRunning: boolean;
  readonly total: number;
}

const toBarStats = (group: Direction[], runs: GroupRunMap): BarStats => {
  const groupRuns = group.map((member) => groupRun(runs, member.id));

  return {
    anyRunning: groupRuns.some((run) => run.running),
    total: groupRuns.reduce((sum, run) => sum + run.costUsd, 0),
  };
};

export { toBarStats };

export type { BarStats };
