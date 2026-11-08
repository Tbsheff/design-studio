import type { RunLevel } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { cn } from "../../ai/lib/utils.js";
import { RADIO_ROLE } from "./aria-role-model.js";

const LevelOption = ({
  baseId,
  isDisabled,
  isOn,
  level,
  tabIndex,
  tipSide,
  onRegister,
  onChange,
}: {
  baseId: string;
  isDisabled: boolean;
  isOn: boolean;
  level: RunLevel;
  tabIndex: number;
  tipSide: "top" | "bottom";
  onRegister: (level: RunLevel, el: HTMLButtonElement | null) => void;
  onChange: (level: RunLevel) => void;
}): ReactElement => {
  const setRef = useCallback(
    (el: HTMLButtonElement | null): void => onRegister(level, el),
    [onRegister, level]
  );

  const choose = useCallback(() => onChange(level), [onChange, level]);

  return (
    <button
      ref={setRef}
      tabIndex={tabIndex}
      type="button"
      role={RADIO_ROLE}
      aria-checked={isOn}
      aria-describedby={`${baseId}-${level}-hint`}
      disabled={isDisabled}
      className={cn(isOn && "on")}
      data-testid={`level-option-${level}`}
      data-tip={LEVEL_PRESETS[level].hint}
      data-tip-side={tipSide}
      onClick={choose}
    >
      {LEVEL_PRESETS[level].label}
    </button>
  );
};

export { LevelOption };
