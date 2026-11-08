import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toCountText } from "./errors-model.js";

interface ErrorsChipProps {
  readonly count: number;
  readonly onOpen: () => void;
  readonly onClear: () => void;
}

const REGION_ROLE = "region";

const ErrorsChip = ({
  count,
  onClear,
  onOpen,
}: ErrorsChipProps): ReactElement => (
  <div
    className="errors-chip"
    role={REGION_ROLE}
    aria-label={copy.previewErrors}
  >
    <button
      type="button"
      className="errors-chip-open"
      aria-expanded={false}
      data-tip={copy.showTheErrors}
      onClick={onOpen}
    >
      <Icon name="alert" size={14} />
      <span>{toCountText(count)}</span>
      <Icon name="chevronRight" size={12} />
    </button>
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.clearErrors}
      data-tip={copy.clear}
      data-tip-align="end"
      onClick={onClear}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

export { ErrorsChip };
