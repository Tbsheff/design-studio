import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { FillDraft } from "./fill-model.js";

import styles from "./fill.module.css";

interface AngleSelectProps {
  readonly disabled: boolean;
  readonly draft: FillDraft;
  readonly onDraft: (next: FillDraft) => void;
}

const FULL_TURN = 360;
const ANGLE_STEP = 45;

const ANGLES: readonly number[] = Array.from(
  { length: FULL_TURN / ANGLE_STEP },
  (_unused, index) => index * ANGLE_STEP
);

const ANGLE_ID = "fill-angle";

const AngleSelect = ({
  disabled,
  draft,
  onDraft,
}: AngleSelectProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onDraft({ ...draft, angle: Number(event.target.value) });
    },
    [draft, onDraft]
  );

  const custom = !ANGLES.includes(draft.angle);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={ANGLE_ID}>
        {copy.angle}
      </label>
      <select
        aria-label={`${copy.angleLabel}: ${draft.angle}°`}
        className={styles.select}
        disabled={disabled}
        id={ANGLE_ID}
        value={String(draft.angle)}
        onChange={handlePick}
      >
        {custom && (
          <option value={String(draft.angle)}>{`${draft.angle}°`}</option>
        )}
        {ANGLES.map((angle) => (
          <option key={angle} value={String(angle)}>
            {`${angle}°`}
          </option>
        ))}
      </select>
    </div>
  );
};

export { AngleSelect };
