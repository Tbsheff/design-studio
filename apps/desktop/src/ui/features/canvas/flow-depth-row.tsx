import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FlowDepthButton } from "./flow-depth-button.js";

const DEPTHS = [0, 1, 2] as const;

const FlowDepthRow = ({
  depth,
  onPick,
}: {
  depth: number;
  onPick: (value: number) => void;
}): ReactElement => (
  <div className="flow-row">
    <span className="flow-label">{copy.followLinks}</span>
    <fieldset className="segmented" aria-label={copy.linkStepsTo}>
      {DEPTHS.map((value) => (
        <FlowDepthButton
          key={value}
          depth={depth}
          onPick={onPick}
          value={value}
        />
      ))}
    </fieldset>
  </div>
);

export { FlowDepthRow };
