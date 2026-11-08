import type { CompiledTokenEntry } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { modeValue } from "../../../shared/token-match.js";
import type {
  TokenFieldState,
  TokenMode,
} from "../../../shared/token-match.js";
import { findEntry, toFieldLabel, toStateTip } from "./token-control-model.js";
import { tokenShortName } from "./token-picker-model.js";
import { TokenSwatch } from "./token-swatch.js";

const CHIP_ICON_SIZE = 12;

interface TokenFieldButtonProps {
  readonly entries: CompiledTokenEntry[];
  readonly isExpanded: boolean;
  readonly label: string;
  readonly mode: TokenMode;
  readonly onClick: () => void;
  readonly state: TokenFieldState;
}

const toChipName = (
  entry: CompiledTokenEntry | null,
  current: string | null
): string | null => {
  if (!current) {
    return null;
  }

  if (entry) {
    return tokenShortName(entry);
  }

  return current;
};

const TokenFieldButton = ({
  entries,
  isExpanded,
  label,
  mode,
  onClick,
  state,
}: TokenFieldButtonProps): ReactNode => {
  let current: string | null = null;

  if (state.kind === "token") {
    current = state.match.cssVar;
  }

  const entry = findEntry(entries, current);
  const name = toChipName(entry, current);

  return (
    <button
      type="button"
      className="tk-open"
      aria-label={toFieldLabel(label, current)}
      aria-haspopup="listbox"
      aria-expanded={isExpanded}
      data-tip={toStateTip(state, current)}
      data-tip-align="end"
      onClick={onClick}
    >
      {name && (
        <span className="tk-name-chip">
          {entry?.type === "color" && (
            <TokenSwatch color={modeValue(entry, mode)} />
          )}
          <span className="truncate">{name}</span>
        </span>
      )}
      <Icon name="token" size={CHIP_ICON_SIZE} />
    </button>
  );
};

export { TokenFieldButton };
