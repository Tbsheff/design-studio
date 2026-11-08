import type { JsxInsertPosition } from "@design-studio/contracts/insert";
import { UiSelect } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { POSITIONS } from "./figma-import-model.js";

interface Props {
  readonly canNest: boolean;
  readonly onChange: (position: JsxInsertPosition) => void;
  readonly position: JsxInsertPosition;
}

const FigmaPositionField = ({
  canNest,
  onChange,
  position,
}: Props): ReactElement => {
  const options = useMemo(
    () => POSITIONS.filter((item) => canNest || item.value !== "inside"),
    [canNest]
  );

  return (
    <div className="field">
      <span>{copy.place}</span>
      <UiSelect
        aria-label={copy.place}
        value={position}
        options={options}
        onChange={onChange}
      />
    </div>
  );
};

export { FigmaPositionField };
