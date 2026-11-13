import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ScaleFieldTokens = ({
  isOn,
  onToggle,
}: {
  readonly isOn: boolean;
  readonly onToggle: () => void;
}): ReactElement => (
  <div className="ins-field ins-align-row" data-tip={copy.scaleKeepTokensTip}>
    <span className="ins-scrub static">{copy.scaleKeepTokens}</span>
    <input
      type="checkbox"
      aria-label={copy.scaleKeepTokensTip}
      checked={isOn}
      onChange={onToggle}
    />
  </div>
);

export { ScaleFieldTokens };
