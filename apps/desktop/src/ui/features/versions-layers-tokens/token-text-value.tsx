import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { TokenShortInput } from "./token-short-input.js";
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
      <TokenShortInput
        inputClass="ins-input tkp-text"
        draft={draft}
        isInvalid={Boolean(invalid)}
        label={label}
        value={value}
        onEdit={handleEdit}
      />
    </div>
  );
};

export { TextValue };
