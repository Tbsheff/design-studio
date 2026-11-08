import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toToggleTip } from "./corners-model.js";

interface RadiusToggleProps {
  readonly isSplit: boolean;
  readonly onToggle: () => void;
}

const RadiusToggle = ({
  isSplit,
  onToggle,
}: RadiusToggleProps): ReactElement => (
  <button
    type="button"
    className="icon-btn small ins-toggle"
    aria-label={copy.independentCorners}
    aria-pressed={isSplit}
    data-tip={toToggleTip(isSplit)}
    data-tip-align="end"
    onClick={onToggle}
  >
    <Icon name="corners" size={14} />
  </button>
);

export { RadiusToggle };
