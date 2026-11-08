import type {
  FrameStateDef,
  FrameStatesView,
} from "@design-studio/contracts/frame-state";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FrameStateRow } from "./frame-state-row.js";

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
      <FrameStateRow
        key={state.id}
        isChosen={state.id === chosen}
        onPick={onPick}
        state={state}
      />
    ))}
  </div>
);

export { StateRows };
