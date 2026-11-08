import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toAbsoluteIcon, toAbsoluteTip } from "./position-model.js";

const AbsoluteToggle = ({
  isOn,
  onToggle,
}: {
  readonly isOn: boolean;
  readonly onToggle: () => void;
}): ReactElement => (
  <div className="ins-layout-row">
    <button
      type="button"
      className="btn small has-icon ins-abs-toggle"
      aria-pressed={isOn}
      data-tip={toAbsoluteTip(isOn)}
      onClick={onToggle}
    >
      <Icon name={toAbsoluteIcon(isOn)} size={14} />
      {copy.absolutePosition}
    </button>
  </div>
);

export { AbsoluteToggle };
