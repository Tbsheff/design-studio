import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenAliasChip } from "./token-alias-chip.js";
import { toTokenTitle } from "./token-row-model.js";
import { TokenRowTools } from "./token-row-tools.js";
import type { TokenRowProps } from "./token-row-types.js";
import { TokenUsageCount } from "./token-usage-count.js";

const REVERT_ICON_SIZE = 12;
const IMG_ROLE = "img";

interface TokenRowHeadProps {
  readonly isChanged: boolean;
  readonly row: TokenRowProps;
  readonly swatch: string | null;
}

const toMarkClass = (isChanged: boolean): string => {
  if (isChanged) {
    return "tkp-mark on";
  }

  return "tkp-mark ";
};

const TokenRowHead = ({
  isChanged,
  row,
  swatch,
}: TokenRowHeadProps): ReactNode => {
  const { entry, onRevert } = row;

  const handleRevert = useCallback((): void => {
    onRevert(entry.path);
  }, [entry.path, onRevert]);

  return (
    <div className="tkp-row-head">
      {isChanged && (
        <span
          className={toMarkClass(isChanged)}
          aria-label={COPY.tokenChangedNotCommitted}
          role={IMG_ROLE}
        />
      )}
      {!isChanged && <span className={toMarkClass(isChanged)} />}
      <span
        className="tkp-name-tip"
        data-tip={toTokenTitle(entry)}
        data-tip-side="top"
        data-tip-align="start"
      >
        <code className="tkp-name truncate">{entry.cssVar}</code>
      </span>
      <TokenAliasChip value={row.shown.value} swatch={swatch} />
      <TokenUsageCount name={entry.cssVar} />
      <TokenRowTools name={entry.cssVar} />
      {isChanged && (
        <button
          type="button"
          className="icon-btn small tkp-revert"
          aria-label={`${COPY.tokenRevertPrefix}${entry.cssVar}`}
          data-tip={`${COPY.tokenRevertToPrefix}${row.base.value}`}
          data-tip-align="end"
          onClick={handleRevert}
        >
          <Icon name="undo" size={REVERT_ICON_SIZE} />
        </button>
      )}
    </div>
  );
};

export { TokenRowHead };
