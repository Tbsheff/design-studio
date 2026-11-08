import type { Direction, Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { useVariationBar } from "./use-variation-bar.js";
import type { VariationsState } from "./use-variations.js";
import { money } from "./use-variations.js";
import { VariationBarActions } from "./variation-bar-actions.js";
import { VariationBarHead } from "./variation-bar-head.js";
import { toBarStats } from "./variation-bar-stats.js";
import { VariationNotice } from "./variation-notice.js";
import { toBarVariation } from "./variations-layer-model.js";
import type { GroupRunMap } from "./variations-layer-model.js";

interface VariationBarProps {
  readonly direction: Direction | null;
  readonly group: Direction[];
  readonly project: Project;
  readonly runs: GroupRunMap | null;
  readonly state: VariationsState;
}

const toTotalSuffix = (budgetTotal: number | null): string => {
  if (budgetTotal === null) {
    return " spent";
  }

  return ` of ${money(budgetTotal)}`;
};

const VariationBar = ({
  direction,
  group,
  project,
  runs,
  state,
}: VariationBarProps): ReactElement | null => {
  const actions = useVariationBar(state, project, direction, group);
  const { cancelAll: onCancel, showAll: onShowAll } = actions;
  const { dismissNotice: onDismiss, noticeText } = actions;
  const first = group[0]?.variation;

  if (!first) {
    return null;
  }

  const stats = toBarStats(project, group, runs ?? {});

  return (
    <>
      <div className="variation-bar" data-testid="variation-bar">
        <VariationBarHead
          count={group.length}
          prompt={first.prompt}
          variation={toBarVariation(direction, first.groupId)}
        />
        <div className="spacer" />
        <span className="variation-bar-total" data-testid="variations-total">
          {money(stats.total)}
          {toTotalSuffix(stats.budgetTotal)}
        </span>
        <VariationBarActions
          isRunning={stats.anyRunning}
          onCancel={onCancel}
          onShowAll={onShowAll}
        />
      </div>
      {noticeText && (
        <VariationNotice
          onDismiss={onDismiss}
          testId={null}
          text={noticeText}
        />
      )}
    </>
  );
};

export { VariationBar };
