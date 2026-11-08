import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ICON_SIZE, toOnClass } from "./auto-layout-model.js";
import type { DirectionOption } from "./auto-layout-model.js";

interface Props {
  readonly option: DirectionOption;
  readonly isOn: boolean;
  readonly onPick: (value: string) => void;
}

const DirectionButton = ({ option, isOn, onPick }: Props): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(option.value);
  }, [onPick, option.value]);

  return (
    <button
      type="button"
      className={toOnClass(isOn)}
      aria-label={option.label}
      aria-pressed={isOn}
      data-tip={option.label}
      onClick={handlePick}
    >
      <Icon name={option.icon} size={ICON_SIZE} />
    </button>
  );
};

export { DirectionButton };
