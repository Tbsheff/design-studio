import { useCallback, useId, useState } from "react";
import type { ChangeEvent, FocusEvent, ReactElement } from "react";

import { toCapText, toCapValue } from "./completion-model.js";
import { copy } from "./copy.js";

import styles from "./completion.module.css";

interface CompletionCapProps {
  readonly capUsd: number;
  readonly onCommit: (capUsd: number) => void;
}

const CompletionCap = ({
  capUsd,
  onCommit,
}: CompletionCapProps): ReactElement => {
  const capId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const handleDraft = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  }, []);

  const handleCommitCap = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => {
      const next = toCapValue(event.target.value);

      setDraft(null);

      if (next !== null) {
        onCommit(next);
      }
    },
    [onCommit]
  );

  return (
    <label className={styles.cap} htmlFor={capId}>
      {copy.capLabel}
      <input
        id={capId}
        inputMode="decimal"
        value={draft ?? toCapText(capUsd)}
        onBlur={handleCommitCap}
        onChange={handleDraft}
      />
    </label>
  );
};

export { CompletionCap };
