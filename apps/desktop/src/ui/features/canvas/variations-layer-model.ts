import type {
  Direction,
  DirectionVariation,
  RunRequest,
  RunStatus,
  RunSummary,
} from "@design-studio/contracts";

interface GroupRunView {
  directionId: string | null;
  request: RunRequest | null;
  startedAt: number;
  status: RunStatus;
  summary: RunSummary | null;
}

type GroupRunMap = Record<string, GroupRunView>;

interface GroupRun {
  status: RunStatus | null;
  costUsd: number;
  running: boolean;
  error: string | null;
}

const groupRun = (runs: GroupRunMap, directionId: string): GroupRun => {
  const list = Object.values(runs)
    .filter((run) => run.directionId === directionId)
    .toSorted(
      (runView, runViewValue) => runView.startedAt - runViewValue.startedAt
    );

  const latest = list.at(-1);

  const costUsd = list.reduce(
    (sum, run) => sum + (run.summary?.costUsd ?? 0),
    0
  );

  return {
    costUsd,
    error: latest?.summary?.error ?? null,
    running: list.some((run) => run.status === "running"),
    status: latest?.status ?? null,
  };
};

const labelOf = (direction: Direction): string =>
  direction.variation?.label ?? direction.name.slice(0, 1);

const keptText = (direction: Direction | undefined): string =>
  `Kept ${direction?.name ?? "this variation"}. The other variations stay in Versions as directions.`;

const toBarVariation = (
  direction: Direction | null,
  groupId: string
): DirectionVariation | null => {
  if (direction?.variation?.groupId === groupId) {
    return direction.variation;
  }

  return null;
};

const keepBlocker = (
  variation: DirectionVariation,
  run: GroupRun,
  error: string | null
): string | null => {
  if (variation.settled === "kept") {
    return "Already kept in the main design";
  }

  if (variation.settled === "discarded") {
    return "Another variant was kept";
  }

  if (run.running) {
    return "Wait for this variant to finish";
  }

  if (error || run.status === "failed") {
    return "This variant failed, so it cannot be kept";
  }

  if (run.status !== "completed") {
    return "This variant has no finished run";
  }

  return null;
};

export { groupRun, keepBlocker, keptText, labelOf, toBarVariation };

export type { GroupRun, GroupRunMap, GroupRunView };
