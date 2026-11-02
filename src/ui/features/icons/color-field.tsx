import { useId } from "react";
import type { ReactElement } from "react";

import { COLOR_TOKENS, copy } from "./copy.js";
import type { Picker } from "./use-picker.js";

import styles from "./icons.module.css";

interface ColorFieldProps {
  readonly picker: Picker;
}

const helpClass = (problem: string | null): string => {
  if (problem) {
    return `${styles.help} ${styles.helpError}`;
  }

  return styles.help;
};

const ColorField = ({ picker }: ColorFieldProps): ReactElement => {
  const listId = useId();
  const problem = picker.colorProblem;

  return (
    <label className="field">
      <span>{copy.color}</span>
      <input
        aria-invalid={problem !== null}
        aria-label={copy.color}
        autoComplete="off"
        className="mono"
        list={listId}
        name="color"
        placeholder="currentColor"
        spellCheck={false}
        value={picker.color}
        onChange={picker.handleColor}
      />
      <datalist id={listId}>
        {COLOR_TOKENS.map((token) => (
          <option key={token} value={token}>
            {token}
          </option>
        ))}
      </datalist>
      <span className={helpClass(problem)}>{problem ?? copy.colorHelp}</span>
    </label>
  );
};

export { ColorField };
