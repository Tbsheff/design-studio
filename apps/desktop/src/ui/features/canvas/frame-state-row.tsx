import { STATE_HINTS } from "@design-studio/contracts/frame-state";
import type { FrameStateDef } from "@design-studio/contracts/frame-state";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toRuleCount } from "./frame-state-ui-model.js";

const FrameStateRow = ({
  isChosen,
  onPick,
  state,
}: {
  isChosen: boolean;
  onPick: (state: FrameStateDef) => void;
  state: FrameStateDef;
}): ReactElement => {
  const pick = useCallback(() => onPick(state), [onPick, state]);

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={isChosen}
      className="ui-menu-item"
      tabIndex={-1}
      data-tip={STATE_HINTS[state.kind]}
      onClick={pick}
    >
      <span>{state.name}</span>
      {state.kind === "mock" && (
        <span className="ui-menu-meta">
          {toRuleCount(state.mocks?.length ?? 0)}
        </span>
      )}
    </button>
  );
};

export { FrameStateRow };
