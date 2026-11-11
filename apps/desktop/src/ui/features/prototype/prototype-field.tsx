import { useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./prototype.module.css";

interface PrototypeFieldProps {
  readonly onPrompt: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly prompt: string;
}

const PrototypeField = ({
  onPrompt,
  prompt,
}: PrototypeFieldProps): ReactElement => {
  const promptId = useId();
  const hintId = useId();

  return (
    <div className={styles.body}>
      <label className={styles.label} htmlFor={promptId}>
        {copy.prompt}
      </label>
      <textarea
        id={promptId}
        name="prompt"
        className={styles.prompt}
        aria-describedby={hintId}
        placeholder={copy.placeholder}
        rows={4}
        value={prompt}
        onChange={onPrompt}
        data-autofocus=""
        data-testid="prototype-prompt"
      />
      <p id={hintId} className={styles.hint}>
        {copy.hint}
      </p>
    </div>
  );
};

export { PrototypeField };

export type { PrototypeFieldProps };
