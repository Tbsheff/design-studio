import { useCallback } from "react";
import type { ReactElement } from "react";

import { toDraftHint, toDraftsLabel } from "../../domain/draft-counts.js";

const DraftsOption = ({
  count,
  isChecked,
  isOff,
  onPick,
}: {
  readonly count: number;
  readonly isChecked: boolean;
  readonly isOff: boolean;
  readonly onPick: (count: number) => void;
}): ReactElement => {
  const pick = useCallback((): void => {
    if (!isOff) {
      onPick(count);
    }
  }, [count, isOff, onPick]);

  return (
    <button
      type="button"
      role="menuitemradio"
      className="ui-menu-item choice-item"
      aria-checked={isChecked}
      aria-disabled={isOff}
      tabIndex={-1}
      onClick={pick}
    >
      <span className="choice-label">{toDraftsLabel(count)}</span>
      <span className="choice-hint" aria-hidden="true">
        {toDraftHint(count)}
      </span>
    </button>
  );
};

export { DraftsOption };
