import { STATE_HINTS } from "@design-studio/contracts/frame-state";
import type {
  FrameStateDef,
  FrameStatesView,
} from "@design-studio/contracts/frame-state";
import type { ReactElement } from "react";

import "../../styles/frame-state.css";
import { copy } from "./copy.js";

const StateRows = ({
  view,
  chosen,
  onPick,
}: {
  view: FrameStatesView;
  chosen: string;
  onPick: (state: FrameStateDef) => void;
}): ReactElement => (
  <div className="ui-menu-section">
    <div className="ui-menu-label">{copy.previewState}</div>
    {view.states.map((state) => (
      <button
        key={state.id}
        type="button"
        role="menuitemradio"
        aria-checked={state.id === chosen}
        className="ui-menu-item"
        tabIndex={-1}
        data-tip={STATE_HINTS[state.kind]}
        onClick={() => onPick(state)}
      >
        <span>{state.name}</span>
        {state.kind === "mock" && (
          <span className="ui-menu-meta">
            {state.mocks?.length === 1
              ? "1 rule"
              : `${state.mocks?.length ?? 0} rules`}
          </span>
        )}
      </button>
    ))}
  </div>
);

export { StateRows };
