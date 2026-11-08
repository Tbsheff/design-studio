import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { SizeLive } from "./size-live.js";
import type { ResizeReadout } from "./size-row-model.js";
import { SizeValue } from "./size-value.js";
import type { Axis, SizeMode } from "./sizing-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

const toLiveSize = (axis: Axis, resizing: ResizeReadout): number => {
  if (axis === "width") {
    return resizing.width;
  }

  return resizing.height;
};

const SizeSlot = ({
  axis,
  mode,
  used,
  edit,
  resizing,
  onDrag,
}: {
  readonly axis: Axis;
  readonly mode: SizeMode;
  readonly used: string;
  readonly edit: DirectEdit;
  readonly resizing: ResizeReadout | null;
  readonly onDrag: (event: ReactPointerEvent<HTMLLabelElement>) => void;
}): ReactElement => {
  if (resizing) {
    return <SizeLive axis={axis} value={toLiveSize(axis, resizing)} />;
  }

  return (
    <SizeValue
      axis={axis}
      mode={mode}
      used={used}
      edit={edit}
      onDrag={onDrag}
    />
  );
};

export { SizeSlot };
