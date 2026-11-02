import { useCallback, useId, useMemo } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { SuggestionItem } from "./suggestion-item.js";
import { suggestionsOf, withSuggestion } from "./variant-model.js";

import styles from "./component-variant.module.css";

interface ClassFieldProps {
  readonly disabled: boolean;
  readonly known: readonly string[];
  readonly onChange: (classes: string) => void;
  readonly value: string;
}

const ClassField = (props: ClassFieldProps): ReactElement => {
  const { known, onChange, value } = props;
  const id = useId();

  const hints = useMemo(() => suggestionsOf(known, value), [known, value]);

  const handleClassesType = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handlePick = useCallback(
    (pick: string): void => {
      onChange(withSuggestion(value, pick));
    },
    [onChange, value]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {copy.classes}
      </label>
      <textarea
        id={id}
        className={`ins-input mono ${styles.classes}`}
        disabled={props.disabled}
        placeholder={copy.classesHint}
        rows={3}
        spellCheck={false}
        value={value}
        onChange={handleClassesType}
      />
      {hints.length > 0 && (
        <section
          className={`ui-menu ${styles.hints}`}
          aria-label={copy.suggestions}
        >
          {hints.map((hint) => (
            <SuggestionItem key={hint} text={hint} onPick={handlePick} />
          ))}
        </section>
      )}
    </div>
  );
};

export { ClassField };
