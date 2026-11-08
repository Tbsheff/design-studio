import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

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

const toAngleOption = (angle: number): UiSelectOption => ({
  label: `${angle}°`,
  value: String(angle),
});

const toAngleOptions = (current: number): readonly UiSelectOption[] => {
  const options = ANGLES.map((angle) => toAngleOption(angle));

  if (ANGLES.includes(current)) {
    return options;
  }

  return [toAngleOption(current), ...options];
};

const AngleSelect = ({
  disabled,
  draft,
  onDraft,
}: AngleSelectProps): ReactElement => {
  const options = useMemo(() => toAngleOptions(draft.angle), [draft.angle]);

  const pickAngle = useCallback(
    (next: string): void => {
      onDraft({ ...draft, angle: Number(next) });
    },
    [draft, onDraft]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={ANGLE_ID}>
        {copy.angle}
      </label>
      <UiSelect
        aria-label={`${copy.angleLabel}: ${draft.angle}°`}
        disabled={disabled}
        id={ANGLE_ID}
        options={options}
        size="sm"
        value={String(draft.angle)}
        onChange={pickAngle}
      />
    </div>
  );
};

export { AngleSelect };
