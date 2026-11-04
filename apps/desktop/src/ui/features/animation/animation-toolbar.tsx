import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { MIN_DURATION_MS, toWithDuration } from "./animation-model.js";
import type { Draft } from "./animation-model.js";
import { ChoiceSelect } from "./choice-select.js";
import { copy, LOOP_OPTIONS, TRIGGER_OPTIONS } from "./copy.js";

import styles from "./animation.module.css";

interface AnimationToolbarProps {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
}

const isTrigger = (value: string): value is Draft["trigger"] =>
  TRIGGER_OPTIONS.some((option) => option.id === value);

const isLoop = (value: string): value is Draft["loop"] =>
  LOOP_OPTIONS.some((option) => option.id === value);

const AnimationToolbar = ({
  draft,
  onChange,
}: AnimationToolbarProps): ReactElement => {
  const handleTrigger = useCallback(
    (value: string): void => {
      if (isTrigger(value)) {
        onChange({ ...draft, trigger: value });
      }
    },
    [draft, onChange]
  );

  const handleLoop = useCallback(
    (value: string): void => {
      if (isLoop(value)) {
        onChange({ ...draft, loop: value });
      }
    },
    [draft, onChange]
  );

  const handleDuration = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const next = Number(event.target.value);

      if (Number.isInteger(next) && next >= MIN_DURATION_MS) {
        onChange(toWithDuration(draft, next));
      }
    },
    [draft, onChange]
  );

  const handleName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...draft, name: event.target.value });
    },
    [draft, onChange]
  );

  return (
    <div className={styles.toolbar}>
      <input
        aria-label={copy.animation}
        className={styles.input}
        onChange={handleName}
        value={draft.name}
      />
      <ChoiceSelect
        label={copy.trigger}
        onChoose={handleTrigger}
        options={TRIGGER_OPTIONS}
        value={draft.trigger}
      />
      <ChoiceSelect
        label={copy.loop}
        onChoose={handleLoop}
        options={LOOP_OPTIONS}
        value={draft.loop}
      />
      <input
        aria-label={copy.duration}
        className={styles.input}
        min={MIN_DURATION_MS}
        onChange={handleDuration}
        type="number"
        value={draft.durationMs}
      />
    </div>
  );
};

export { AnimationToolbar };
