import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

const CLEAR_ICON_SIZE = 12;

const StateChip = ({
  label,
  short,
  tip,
  onClear,
}: {
  label: string;
  short: ReactNode;
  tip: string;
  onClear: () => void;
}): ReactElement => (
  <span
    className="ui-chip composer-state"
    data-tip={tip}
    data-tip-side="top"
    data-tip-align="start"
  >
    <span className="composer-state-short" aria-hidden="true">
      {short}
    </span>
    <span className="composer-state-label">{label}</span>
    <button
      type="button"
      className="icon-btn chip-x"
      aria-label={`Clear ${label}`}
      onClick={onClear}
    >
      <Icon name="close" size={CLEAR_ICON_SIZE} />
    </button>
  </span>
);

export { StateChip };
