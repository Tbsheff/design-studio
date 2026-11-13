import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useSharedLayers } from "./use-shared-layers.js";
import type { SharedLayersState } from "./use-shared-layers.js";

interface Props {
  readonly directionId: string | null;
  readonly editCount: number;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[];
}

const ICON_SIZE = 14;

const toSharedLine = (state: SharedLayersState): string => {
  const { same, total } = state.counts;

  if (same === total) {
    return copy.sharedOnPages(total);
  }

  return copy.sharedMatchPages(same, total);
};

const SharedLayersChip = ({
  directionId,
  editCount,
  projectId,
  selection,
}: Props): ReactElement | null => {
  const state = useSharedLayers({
    directionId,
    editCount,
    projectId,
    selection,
  });

  if (!state.isShown) {
    return null;
  }

  return (
    <section
      className="shared-layers"
      aria-label={copy.sharedLabel}
      data-tip={copy.sharedTip(state.files)}
    >
      <Icon name="layers" size={ICON_SIZE} />
      {state.isApplicable && (
        <button
          type="button"
          className="btn small primary"
          disabled={state.isPending}
          onClick={state.handleApply}
        >
          {copy.sharedApplyPages(state.counts.same)}
        </button>
      )}
      {!state.isApplicable && (
        <span className="shared-layers-line">{toSharedLine(state)}</span>
      )}
      {state.error && (
        <span className="shared-layers-error">{state.error}</span>
      )}
    </section>
  );
};

export { SharedLayersChip };
