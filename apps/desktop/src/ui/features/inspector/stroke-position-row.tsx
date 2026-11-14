import { UiSelect } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { strokePositionCopy } from "./copy.js";
import {
  toPositionTip,
  toStrokePositionOptions,
} from "./stroke-position-model.js";
import type { StrokePosition } from "./stroke-position-model.js";

interface StrokePositionRowProps {
  readonly isAllSides: boolean;
  readonly position: StrokePosition;
  readonly onPositionPick: (next: string) => void;
}

const POSITION_SELECT_ID = "ins-stroke-position";

const StrokePositionRow = ({
  isAllSides,
  position,
  onPositionPick,
}: StrokePositionRowProps): ReactElement => {
  const options = useMemo(
    () =>
      toStrokePositionOptions(isAllSides).map((option) => ({
        disabled: option.isDisabled,
        label: option.label,
        value: option.value,
      })),
    [isAllSides]
  );

  return (
    <div className="ins-field select" data-tip={toPositionTip(isAllSides)}>
      <UiSelect
        id={POSITION_SELECT_ID}
        aria-label={strokePositionCopy.positionLabel}
        value={position}
        options={options}
        onChange={onPositionPick}
      />
    </div>
  );
};

export { StrokePositionRow };
