import type { ReactElement } from "react";

import { MODE_LABEL } from "./composer-mode-model.js";
import { copy } from "./copy.js";
import { MODES } from "./run-settings-model.js";
import type { ModeSetting } from "./run-settings-model.js";
import { SegmentRadio } from "./segment-radio.js";
import { useRovingRadioGroup } from "./use-roving-radio-group.js";

const ModeToggle = ({
  mode,
  hintId,
}: {
  mode: ModeSetting;
  hintId: string;
}): ReactElement => {
  const { onChange } = mode;
  const radios = useRovingRadioGroup(MODES, mode.value, onChange);
  const { onKeyDown } = radios;

  return (
    <div
      tabIndex={0}
      className="segmented"
      role="radiogroup"
      aria-label={copy.runMode}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
    >
      {MODES.map((choice) => (
        <SegmentRadio
          key={choice}
          option={choice}
          label={MODE_LABEL[choice]}
          isOn={mode.value === choice}
          isDisabled={false}
          radio={radios.item(choice)}
          onPick={onChange}
        />
      ))}
    </div>
  );
};

export { ModeToggle };
