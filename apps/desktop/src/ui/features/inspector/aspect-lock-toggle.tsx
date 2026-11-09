import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { ICON_SIZE, toLinkIcon } from "./box-model-model.js";
import { copy } from "./copy.js";

interface AspectLockToggleProps {
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const AspectLockToggle = ({
  isDisabled,
  isOn,
  onToggle,
}: AspectLockToggleProps): ReactElement => (
  <div className="ins-field ins-align-row ins-aspect-lock">
    <span className="ins-scrub static">{copy.aspectLock}</span>
    <button
      type="button"
      className="icon-btn ins-link"
      aria-label={copy.aspectLockToggle}
      aria-pressed={isOn}
      data-tip={copy.aspectLockToggle}
      disabled={isDisabled}
      onClick={onToggle}
    >
      <Icon name={toLinkIcon(isOn)} size={ICON_SIZE} />
    </button>
  </div>
);

export { AspectLockToggle };
