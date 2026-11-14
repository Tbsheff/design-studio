import { useCallback, useRef } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { FieldSpec } from "./effect-model.js";

import styles from "./effect.module.css";

interface SentValue {
  readonly from: number;
  readonly next: number;
}

interface EffectFieldProps {
  readonly disabled: boolean;
  readonly spec: FieldSpec;
  readonly value: number;
  readonly onCommit: (spec: FieldSpec, value: number) => void;
}

const EffectField = ({
  disabled,
  spec,
  value,
  onCommit,
}: EffectFieldProps): ReactElement => {
  const label = copy.fieldLabel[spec.key];
  const sent = useRef<SentValue | null>(null);

  const commit = useCallback(
    (next: number): void => {
      const last = sent.current;
      const isSent = last !== null && last.from === value && last.next === next;

      if (Number.isFinite(next) && next !== value && !isSent) {
        sent.current = { from: value, next };
        onCommit(spec, next);
      }
    },
    [onCommit, spec, value]
  );

  const clearSent = useCallback((): void => {
    sent.current = null;
  }, []);

  const commitBlurred = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => {
      commit(event.currentTarget.valueAsNumber);
    },
    [commit]
  );

  const commitOnEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        commit(event.currentTarget.valueAsNumber);
      }
    },
    [commit]
  );

  return (
    <label className="ins-field">
      <span className={styles.label}>{label}</span>
      <input
        key={value}
        aria-label={label}
        className="ins-input"
        defaultValue={value}
        disabled={disabled}
        max={spec.maximum}
        min={spec.minimum}
        step={spec.step}
        type="number"
        onBlur={commitBlurred}
        onFocus={clearSent}
        onKeyDown={commitOnEnter}
      />
    </label>
  );
};

export { EffectField };

export type { EffectFieldProps };
