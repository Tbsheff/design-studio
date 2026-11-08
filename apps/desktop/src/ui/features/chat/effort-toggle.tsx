import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EFFORTS, EFFORT_LABEL, toEffortValue } from "./run-settings-model.js";
import type { EffortChoice, EffortSetting } from "./run-settings-model.js";
import { SegmentRadio } from "./segment-radio.js";
import { useRovingRadioGroup } from "./use-roving-radio-group.js";

const EffortToggle = ({
  effort,
  hintId,
}: {
  effort: EffortSetting;
  hintId: string;
}): ReactElement => {
  const choice: EffortChoice = effort.value ?? "auto";
  const { onChange } = effort;

  const pick = useCallback(
    (next: EffortChoice): void => onChange(toEffortValue(next)),
    [onChange]
  );

  const radios = useRovingRadioGroup(EFFORTS, choice, pick);
  const { onKeyDown } = radios;

  return (
    <div
      tabIndex={0}
      className="segmented"
      role="radiogroup"
      aria-label={copy.effort}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
    >
      {EFFORTS.map((option) => (
        <SegmentRadio
          key={option}
          option={option}
          label={EFFORT_LABEL[option]}
          isOn={choice === option}
          isDisabled={false}
          radio={radios.item(option)}
          onPick={pick}
        />
      ))}
    </div>
  );
};

export { EffortToggle };
