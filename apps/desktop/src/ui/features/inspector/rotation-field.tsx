import type { ReactElement, RefObject } from "react";
import { useMemo } from "react";

import { rotationCopy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { toRotationDisplay } from "./flip-model.js";
import { NumberField } from "./number-field.js";

const ROTATE_SHIFT_STEP = 15;

const RotationField = ({
  edit,
  inputRef,
}: {
  readonly edit: DirectEdit;
  readonly inputRef: RefObject<HTMLInputElement | null>;
}): ReactElement => {
  const display = toRotationDisplay(edit.values.rotate);

  const spec = useMemo(
    () => ({
      display,
      edit,
      label: rotationCopy.label,
      prop: "rotate" as const,
      shiftStep: ROTATE_SHIFT_STEP,
      unit: "deg",
    }),
    [display, edit]
  );

  return (
    <div className="ins-grid" data-tip={rotationCopy.tip}>
      <NumberField short={rotationCopy.short} spec={spec} inputRef={inputRef} />
    </div>
  );
};

export { RotationField };
