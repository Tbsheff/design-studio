import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

type FieldSize = "ms" | "target" | "url";

interface TextCommitFieldProps {
  readonly isValid: (text: string) => boolean;
  readonly label: string;
  readonly onCommit: (text: string) => void;
  readonly placeholder: string;
  readonly size: FieldSize;
  readonly type: "number" | "text" | "url";
  readonly value: string;
}

const FIELD_CLASS = {
  ms: "proto-input proto-ms",
  target: "proto-input proto-target",
  url: "proto-input proto-url",
} satisfies Record<FieldSize, string>;

const TextCommitField = (props: TextCommitFieldProps): ReactElement => {
  const { isValid, onCommit, value } = props;
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const isWrong = draft !== null && !isValid(draft);

  const handleCommit = useCallback((): void => {
    setDraft(null);

    if (draft !== null && draft !== value && isValid(draft)) {
      onCommit(draft);
    }
  }, [draft, isValid, onCommit, value]);

  const handleDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      event.stopPropagation();

      if (event.key === "Enter") {
        handleCommit();
      }

      if (event.key === "Escape") {
        setDraft(null);
      }
    },
    [handleCommit]
  );

  return (
    <input
      aria-invalid={isWrong}
      aria-label={props.label}
      className={FIELD_CLASS[props.size]}
      placeholder={props.placeholder}
      spellCheck={false}
      type={props.type}
      value={shown}
      onBlur={handleCommit}
      onChange={handleDraft}
      onKeyDown={handleKeyDown}
    />
  );
};

export { TextCommitField };

export type { FieldSize, TextCommitFieldProps };
