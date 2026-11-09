import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { isColorValue } from "./class-suggest-model.js";
import type { SuggestRow } from "./class-suggest-model.js";
import { copy } from "./copy.js";

interface ClassSuggestRowProps {
  readonly isActive: boolean;
  readonly onPick: (className: string) => void;
  readonly row: SuggestRow;
}

const toHighlight = (isActive: boolean): string | null => {
  if (isActive) {
    return "";
  }

  return null;
};

const ClassSuggestRow = ({
  isActive,
  onPick,
  row,
}: ClassSuggestRowProps): ReactElement => {
  const { className, isToken, tokenName, value } = row;
  const onClick = useCallback(() => onPick(className), [onPick, className]);
  const swatch = useMemo(() => ({ background: value }), [value]);
  const isColor = isToken && isColorValue(value);

  return (
    <button
      className="ui-menu-item cls-suggest-row"
      data-highlighted={toHighlight(isActive)}
      role="menuitem"
      tabIndex={-1}
      type="button"
      onClick={onClick}
    >
      {isColor && <span className="cls-suggest-swatch" style={swatch} />}
      <span className="mono cls-suggest-name">{className}</span>
      {isToken && !isColor && (
        <span className="ui-menu-meta mono">{value}</span>
      )}
      {isToken && (
        <span className="ui-menu-meta cls-suggest-token">{tokenName}</span>
      )}
      {!isToken && (
        <span className="ui-menu-meta cls-suggest-raw">{copy.notAToken}</span>
      )}
    </button>
  );
};

export { ClassSuggestRow };
