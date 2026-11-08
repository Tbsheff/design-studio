import { RUN_LEVELS } from "@design-studio/contracts";
import type { RunLevel } from "@design-studio/contracts";
import { useId } from "react";
import type { ReactElement } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { copy } from "./copy.js";
import { LevelOption } from "./level-option.js";
import { useRovingRadioGroup } from "./use-roving-radio-group.js";

interface Props {
  value: RunLevel;
  onChange: (level: RunLevel) => void;
  disabled?: boolean;
  tipSide?: "top" | "bottom";
}

const LevelControl = ({
  value,
  onChange,
  disabled = false,
  tipSide = "top",
}: Props): ReactElement => {
  const baseId = useId();

  const { register, tabIndexOf, onKeyDown } = useRovingRadioGroup(
    RUN_LEVELS,
    value,
    onChange
  );

  return (
    <div
      tabIndex={0}
      className="segmented level-control"
      role="radiogroup"
      aria-label={copy.runLevel}
      data-testid="level-control"
      onKeyDown={onKeyDown}
    >
      {RUN_LEVELS.map((level) => (
        <LevelOption
          key={level}
          baseId={baseId}
          isDisabled={disabled}
          isOn={level === value}
          level={level}
          tabIndex={tabIndexOf(level)}
          tipSide={tipSide}
          onChange={onChange}
          onRegister={register}
        />
      ))}
      {RUN_LEVELS.map((level) => (
        <span key={level} id={`${baseId}-${level}-hint`} hidden>
          {LEVEL_PRESETS[level].hint}
        </span>
      ))}
    </div>
  );
};

export { LevelControl };
