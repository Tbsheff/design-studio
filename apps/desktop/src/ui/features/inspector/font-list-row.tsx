import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toRowMeta } from "./font-list-model.js";
import type { FontRow } from "./font-list-model.js";

interface FontListRowProps {
  readonly isActive: boolean;
  readonly isFailed: boolean;
  readonly onPick: (row: FontRow) => void;
  readonly row: FontRow;
}

const toHighlight = (isActive: boolean): string | null => {
  if (isActive) {
    return "";
  }

  return null;
};

const toTip = (isFailed: boolean): string | null => {
  if (isFailed) {
    return copy.fontLoadFailed;
  }

  return null;
};

const FontListRow = ({
  isActive,
  isFailed,
  onPick,
  row,
}: FontListRowProps): ReactElement => {
  const onClick = useCallback(() => onPick(row), [onPick, row]);

  return (
    <button
      className="ui-menu-item cls-suggest-row"
      data-highlighted={toHighlight(isActive)}
      data-tip={toTip(isFailed)}
      role="menuitem"
      tabIndex={-1}
      type="button"
      onClick={onClick}
    >
      <span className="cls-suggest-name">{row.family}</span>
      <span className="ui-menu-meta cls-suggest-token">{toRowMeta(row)}</span>
    </button>
  );
};

export { FontListRow };
