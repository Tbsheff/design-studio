import type { WireOutput } from "@design-studio/actions/_core/action";
import type { getStatesRun } from "@design-studio/actions/run/get-states";

import { stateRunCopy } from "./copy.js";

type StateRunWire = WireOutput<typeof getStatesRun>;

type StateRunRow = StateRunWire["items"][number];

interface StateRunIdle {
  readonly kind: "idle";
}

interface StateRunActive {
  readonly kind: "running";
  readonly line: string;
  readonly runId: string | null;
}

interface StateRunEnded {
  readonly kind: "ended";
  readonly line: string;
}

type StateRunPhase = StateRunActive | StateRunEnded | StateRunIdle;

const SEQUENCE_PREFIX = "states-";

const IDLE_PHASE: StateRunIdle = { kind: "idle" };

const toSequenceId = (sectionId: string): string =>
  `${SEQUENCE_PREFIX}${sectionId}`;

const isActiveRow = (row: StateRunRow): boolean =>
  row.status === "running" || row.status === "waiting";

const isEndedRow = (row: StateRunRow): boolean =>
  row.status === "failed" || row.status === "stopped";

const toLastRunId = (
  rows: readonly StateRunRow[],
  index: number
): string | null =>
  rows
    .slice(0, index + 1)
    .flatMap((row): string[] => {
      if (row.runId === null) {
        return [];
      }

      return [row.runId];
    })
    .at(-1) ?? null;

const toActivePhase = (
  rows: readonly StateRunRow[],
  index: number
): StateRunActive => {
  const row = rows[index];

  return {
    kind: "running",
    line: `${stateRunCopy.designing}${row?.stateName ?? ""} (${index + 1}${stateRunCopy.of}${rows.length})…`,
    runId: toLastRunId(rows, index),
  };
};

const toStateRunPhase = (wire: StateRunWire | null): StateRunPhase => {
  if (wire === null) {
    return IDLE_PHASE;
  }

  const rows = wire.items;
  const active = rows.findIndex((row) => isActiveRow(row));

  if (active !== -1) {
    return toActivePhase(rows, active);
  }

  const ended = rows.find((row) => isEndedRow(row));

  if (!ended) {
    return IDLE_PHASE;
  }

  return { kind: "ended", line: `${ended.stateName}${stateRunCopy.notDone}` };
};

const toStopRunId = (phase: StateRunPhase): string | null => {
  if (phase.kind !== "running") {
    return null;
  }

  return phase.runId;
};

export { toSequenceId, toStateRunPhase, toStopRunId };

export type { StateRunActive, StateRunEnded, StateRunPhase, StateRunWire };
