import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toOnClass } from "./rows-model.js";

interface TruncateToggleProps {
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const TruncateToggle = ({
  isDisabled,
  isOn,
  onToggle,
}: TruncateToggleProps): ReactElement => (
  <fieldset className="ins-toggles" aria-label={copy.truncate}>
    <button
      type="button"
      className={toOnClass(isOn)}
      aria-label={copy.truncateToggle}
      aria-pressed={isOn}
      data-tip={copy.truncateToggle}
      disabled={isDisabled}
      onClick={onToggle}
    >
      {copy.text2}
    </button>
  </fieldset>
);

export { TruncateToggle };
