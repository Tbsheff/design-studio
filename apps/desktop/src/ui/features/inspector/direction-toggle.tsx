import { useCallback } from "react";
import type { ReactElement } from "react";

import { DIRECTIONS } from "./auto-layout-model.js";
import { copy } from "./copy.js";
import { DirectionButton } from "./direction-button.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
  readonly direction: string;
}

const DirectionToggle = ({ edit, direction }: Props): ReactElement => {
  const handlePick = useCallback(
    (value: string): void => {
      setEdit(edit, { "flex-direction": value });
    },
    [edit]
  );

  return (
    <fieldset
      className="segmented icons ins-direction"
      aria-label={copy.direction}
    >
      {DIRECTIONS.map((option) => (
        <DirectionButton
          key={option.value}
          option={option}
          isOn={direction === option.value}
          onPick={handlePick}
        />
      ))}
    </fieldset>
  );
};

export { DirectionToggle };
