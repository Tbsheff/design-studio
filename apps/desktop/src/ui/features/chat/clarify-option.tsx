import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { RADIO_ROLE } from "./aria-role-model.js";

const CHECK_ICON_SIZE = 12;

const ClarifyOption = ({
  isOn,
  option,
  tabIndex,
  onPick,
  onRegister,
}: {
  isOn: boolean;
  option: string;
  tabIndex: number;
  onPick: (value: string) => void;
  onRegister: (option: string, element: HTMLButtonElement | null) => void;
}): ReactElement => {
  const setRef = useCallback(
    (element: HTMLButtonElement | null): void => onRegister(option, element),
    [onRegister, option]
  );

  const pick = useCallback(() => onPick(option), [onPick, option]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isOn}
      className={cn("chip-toggle", isOn && "on")}
      tabIndex={tabIndex}
      ref={setRef}
      onClick={pick}
    >
      {isOn && <Icon name="check" size={CHECK_ICON_SIZE} />}
      {option}
    </button>
  );
};

export { ClarifyOption };
