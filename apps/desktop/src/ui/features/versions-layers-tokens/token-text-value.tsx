import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useDraftText } from "./use-draft-text.js";

interface TextValueProps {
  readonly invalid?: boolean;
  readonly label: string;
  readonly mono?: boolean;
  readonly onChange: (next: string) => void;
  readonly value: string;
}

const TextValue = ({
  invalid,
  label,
  mono,
  onChange,
  value,
}: TextValueProps): ReactNode => {
  const draft = useDraftText(value, onChange);
  const { change } = draft;
  let monoClass = "";

  if (mono) {
    monoClass = "mono";
  }

  const handleEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change(event.target.value);
    },
    [change]
  );

  return (
    <div className={`ins-field tkp-field ${monoClass}`} data-tip={value}>
      <input
        className="ins-input tkp-text"
        aria-label={label}
        aria-invalid={invalid}
        value={draft.shown}
        spellCheck={false}
        autoComplete="off"
        onChange={handleEdit}
        onFocus={draft.handleFocus}
        onKeyDown={draft.handleKeyDown}
        onBlur={draft.handleSettle}
      />
    </div>
  );
};

export { TextValue };
