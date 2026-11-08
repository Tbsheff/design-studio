import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface VariationBarActionsProps {
  readonly isRunning: boolean;
  readonly onCancel: () => Promise<void>;
  readonly onShowAll: () => void;
}

const VariationBarActions = ({
  isRunning,
  onCancel,
  onShowAll,
}: VariationBarActionsProps): ReactElement => (
  <>
    {isRunning && (
      <button
        type="button"
        className="btn small danger has-icon"
        onClick={onCancel}
      >
        <Icon name="stop" size={14} />
        {copy.cancelAll}
      </button>
    )}
    <button
      type="button"
      className="btn small has-icon"
      onClick={onShowAll}
      data-tip={copy.putEveryVariation}
    >
      <Icon name="compare" size={14} />
      {copy.showAll}
    </button>
  </>
);

export { VariationBarActions };
