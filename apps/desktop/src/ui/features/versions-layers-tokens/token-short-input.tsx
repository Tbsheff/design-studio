import type { ChangeEvent, ReactNode } from "react";

import { toShortValue } from "../../domain/token-value.js";
import type { DraftText } from "./use-draft-text.js";

interface TokenShortInputProps {
  readonly draft: DraftText;
  readonly inputClass: string;
  readonly isInvalid: boolean;
  readonly label: string;
  readonly onEdit: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly value: string;
}

const TokenShortInput = ({
  draft,
  inputClass,
  isInvalid,
  label,
  onEdit,
  value,
}: TokenShortInputProps): ReactNode => {
  const short = toShortValue(value);

  return (
    <span className="tkp-stack">
      <input
        className={inputClass}
        aria-label={label}
        aria-invalid={isInvalid}
        value={draft.shown}
        spellCheck={false}
        autoComplete="off"
        onChange={onEdit}
        onKeyDown={draft.handleKeyDown}
        onFocus={draft.handleFocus}
        onBlur={draft.handleSettle}
      />
      {short !== value && (
        <span className="tkp-short" aria-hidden="true">
          {short}
        </span>
      )}
    </span>
  );
};

export { TokenShortInput };
