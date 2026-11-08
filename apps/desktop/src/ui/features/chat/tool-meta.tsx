import type { ReactElement } from "react";

import { formatMs } from "../../domain/format.js";
import { copy } from "./copy.js";
import { DiffBadge } from "./diff-badge.js";
import { SHOW_MS_FROM, STATE_WORD, planHeld } from "./tool-chips-model.js";
import type { RowGroup, ToolState } from "./tool-chips-model.js";
import type { DiffTotals } from "./tool-rows-model.js";

const toShownMs = (group: RowGroup, state: ToolState): number | null => {
  if (state === "pending" || state === "stopped") {
    return null;
  }

  if (group.durationMs !== null && group.durationMs >= SHOW_MS_FROM) {
    return group.durationMs;
  }

  return null;
};

const toDeniedText = (group: RowGroup): string => {
  if (planHeld(group.tool)) {
    return "Plan only";
  }

  return "Denied";
};

const ToolMeta = ({
  group,
  state,
  totals,
}: {
  group: RowGroup;
  state: ToolState;
  totals: DiffTotals | null;
}): ReactElement => {
  const ms = toShownMs(group, state);

  return (
    <>
      {group.count > 1 && (
        <span className="tool-count tabular-nums">
          {copy.text15}
          {group.count}
        </span>
      )}
      {totals && <DiffBadge added={totals.added} removed={totals.removed} />}
      {ms !== null && (
        <span className="tool-ms shrink-0 tabular-nums">{formatMs(ms)}</span>
      )}
      {state === "denied" && (
        <span className="tool-denied">{toDeniedText(group)}</span>
      )}
      {STATE_WORD[state] && state !== "denied" && (
        <span className="sr-only">{STATE_WORD[state]}</span>
      )}
    </>
  );
};

export { ToolMeta };
