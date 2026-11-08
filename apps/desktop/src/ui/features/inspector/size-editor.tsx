import type { FocusEvent, ReactElement, RefObject } from "react";
import { useMemo } from "react";

import { NumberField } from "./number-field.js";
import { AXIS_NAME, AXIS_SHORT } from "./size-row-model.js";
import type { Axis } from "./sizing-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

const CONTENTS_STYLE = { display: "contents" };

const SizeEditor = ({
  axis,
  edit,
  wrapRef,
  inputRef,
  onLeave,
}: {
  readonly axis: Axis;
  readonly edit: DirectEdit;
  readonly wrapRef: RefObject<HTMLDivElement | null>;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onLeave: (event: FocusEvent<HTMLDivElement>) => void;
}): ReactElement => {
  const spec = useMemo(
    () => ({ edit, label: AXIS_NAME[axis], min: 0, prop: axis }),
    [edit, axis]
  );

  return (
    <div ref={wrapRef} style={CONTENTS_STYLE} onBlur={onLeave}>
      <NumberField short={AXIS_SHORT[axis]} spec={spec} inputRef={inputRef} />
    </div>
  );
};

export { SizeEditor };
