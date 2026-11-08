import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SegmentRadio } from "./segment-radio.js";
import { MODEL_OPTIONS } from "./settings-draft-model.js";
import { shortModel } from "./slash-groups.js";
import { useRovingRadioGroup } from "./use-roving-radio-group.js";

const MODEL_IDS = MODEL_OPTIONS.map((option) => option.id);

const toKnownModel = (value: string): string => {
  if (MODEL_IDS.includes(value)) {
    return value;
  }

  return MODEL_IDS[0] ?? "";
};

const ModelToggle = ({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (id: string) => void;
  locked: boolean;
}): ReactElement => {
  const radios = useRovingRadioGroup<string>(
    MODEL_IDS,
    toKnownModel(value),
    onChange,
    () => locked
  );

  const { onKeyDown } = radios;

  return (
    <div
      tabIndex={0}
      className="segmented"
      role="radiogroup"
      aria-label={copy.model}
      onKeyDown={onKeyDown}
    >
      {MODEL_IDS.map((id) => (
        <SegmentRadio
          key={id}
          option={id}
          label={shortModel(id)}
          isOn={value === id}
          isDisabled={locked}
          radio={radios.item(id)}
          onPick={onChange}
        />
      ))}
    </div>
  );
};

export { ModelToggle };
