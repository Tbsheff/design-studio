import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toPatched, toRemoved } from "./animation-model.js";
import type { Draft, Keyframe, KeyframeRef } from "./animation-model.js";
import { ChoiceSelect } from "./choice-select.js";
import { copy, EASING_OPTIONS } from "./copy.js";

import styles from "./animation.module.css";

interface KeyframeFormProps {
  readonly draft: Draft;
  readonly keyframe: Keyframe;
  readonly onChange: (draft: Draft) => void;
  readonly refs: KeyframeRef;
}

const KeyframeForm = ({
  draft,
  keyframe,
  onChange,
  refs,
}: KeyframeFormProps): ReactElement => {
  const handleValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(toPatched(draft, refs, { value: event.target.value }));
    },
    [draft, onChange, refs]
  );

  const handleEasing = useCallback(
    (easing: string): void => {
      onChange(toPatched(draft, refs, { easing }));
    },
    [draft, onChange, refs]
  );

  const handleRemove = useCallback((): void => {
    onChange(toRemoved(draft, refs));
  }, [draft, onChange, refs]);

  return (
    <fieldset className={styles.form}>
      <legend className={styles.legend}>{copy.keyframe}</legend>
      <label className={styles.field}>
        <span>{copy.value}</span>
        <input
          className={styles.input}
          onChange={handleValue}
          value={keyframe.value}
        />
      </label>
      <ChoiceSelect
        label={copy.easing}
        onChoose={handleEasing}
        options={EASING_OPTIONS}
        value={keyframe.easing}
      />
      <button className={styles.small} onClick={handleRemove} type="button">
        {copy.remove}
      </button>
    </fieldset>
  );
};

export { KeyframeForm };
