import { useCallback, useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { NameState } from "./variant-model.js";

import styles from "./component-variant.module.css";

interface NameFieldProps {
  readonly disabled: boolean;
  readonly onChange: (name: string) => void;
  readonly state: NameState;
  readonly value: string;
}

const PROBLEMS: Record<NameState, string | null> = {
  ok: null,
  taken: copy.nameTaken,
  wrong: copy.nameWrong,
};

const NameField = (props: NameFieldProps): ReactElement => {
  const { onChange, state, value } = props;
  const id = useId();
  const problem = PROBLEMS[state];

  const handleNameType = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {copy.name}
      </label>
      <input
        id={id}
        className="ins-input mono"
        aria-invalid={problem !== null && value !== ""}
        disabled={props.disabled}
        placeholder={copy.nameHint}
        spellCheck={false}
        value={value}
        onChange={handleNameType}
      />
      {problem !== null && value !== "" && (
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
};

export { NameField };
