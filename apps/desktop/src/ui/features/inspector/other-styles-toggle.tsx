import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toToggleIcon } from "./other-styles-model.js";

interface OtherStylesToggleProps {
  readonly count: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const OtherStylesToggle = ({
  count,
  isOpen,
  onToggle,
}: OtherStylesToggleProps): ReactElement => (
  <button
    type="button"
    className="ins-other-toggle"
    aria-expanded={isOpen}
    onClick={onToggle}
  >
    <Icon name={toToggleIcon(isOpen)} size={12} />
    <h3>{copy.otherStyles}</h3>
    <span className="ins-other-count">{count}</span>
  </button>
);

export { OtherStylesToggle };
