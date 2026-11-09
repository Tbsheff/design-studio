import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenAliasChip } from "./token-alias-chip.js";
import { TokenRowMenu } from "./token-row-menu.js";
import { toTokenTitle } from "./token-row-model.js";
import type { TokenRowProps } from "./token-row-types.js";
import { TokenUsageCount } from "./token-usage-count.js";
import type { TokenTools } from "./use-token-tools.js";

const REVERT_ICON_SIZE = 12;
const IMG_ROLE = "img";

interface TokenRowLineProps {
  readonly isChanged: boolean;
  readonly row: TokenRowProps;
  readonly swatch: string | null;
  readonly tools: TokenTools;
}

const toMarkClass = (isChanged: boolean): string => {
  if (isChanged) {
    return "tkp-mark on";
  }

  return "tkp-mark ";
};

const TokenRowLine = ({
  isChanged,
  row,
  swatch,
  tools,
}: TokenRowLineProps): ReactNode => {
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
      {tools.hasScope && (
        <TokenRowMenu
          name={entry.cssVar}
          onDelete={tools.handleDelete}
          onRename={tools.rename.handleStart}
          useCount={tools.useCount}
        />
      )}
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

export { TokenRowLine };
