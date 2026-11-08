import { useMemo } from "react";
import type { ReactElement } from "react";

import type { NumberSpec } from "./number-field-model.js";
import { NumberField } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface Props {
  readonly edit: DirectEdit;
  readonly isSplit: boolean;
  readonly isAuto: boolean;
}

const GapFields = ({ edit, isSplit, isAuto }: Props): ReactElement | null => {
  const rowSpec = useMemo<NumberSpec>(
    () => ({ edit, label: "Row gap", min: 0, prop: "row-gap" }),
    [edit]
  );

  const columnSpec = useMemo<NumberSpec>(
    () => ({ edit, label: "Column gap", min: 0, prop: "column-gap" }),
    [edit]
  );

  const gapSpec = useMemo<NumberSpec>(
    () => ({ edit, label: "Gap", min: 0, prop: "gap" }),
    [edit]
  );

  if (isSplit) {
    return (
      <div className="ins-gap-pair">
        <NumberField short="Row" spec={rowSpec} />
        <NumberField short="Col" spec={columnSpec} />
      </div>
    );
  }

  if (isAuto) {
    return null;
  }

  return <NumberField short="Gap" spec={gapSpec} />;
};

export { GapFields };
