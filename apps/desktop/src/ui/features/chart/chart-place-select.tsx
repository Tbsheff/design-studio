import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback } from "react";
import type { Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { isPosition, POSITIONS } from "./chart-model.js";
import type { ChartPosition } from "./chart-model.js";
import { copy } from "./copy.js";

interface ChartPlaceSelectProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly position: ChartPosition;
}

const PLACE_OPTIONS: readonly UiSelectOption[] = POSITIONS.map((option) => ({
  label: option.label,
  value: option.id,
}));

const ChartPlaceSelect = ({
  dispatch,
  position,
}: ChartPlaceSelectProps): ReactElement => {
  const handlePosition = useCallback(
    (value: string): void => {
      if (isPosition(value)) {
        dispatch({ kind: "set-position", position: value });
      }
    },
    [dispatch]
  );

  return (
    <UiSelect
      aria-label={copy.placeLabel}
      options={PLACE_OPTIONS}
      value={position}
      onChange={handlePosition}
    />
  );
};

export { ChartPlaceSelect };
