import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { SizeEditor } from "./size-editor.js";
import { toRoundedPx } from "./size-row-model.js";
import { SizeSummary } from "./size-summary.js";
import { SIZE_MODES } from "./sizing-model.js";
import type { Axis, SizeMode } from "./sizing-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useSizeEdit } from "./use-size-edit.js";

const toModeLabel = (mode: SizeMode): string => {
  const found = SIZE_MODES.find((option) => option.value === mode);

  return found?.label ?? mode;
};

const SizeValue = ({
  axis,
  mode,
  used,
  edit,
  onDrag,
}: {
  readonly axis: Axis;
  readonly mode: SizeMode;
  readonly used: string;
  readonly edit: DirectEdit;
  readonly onDrag: (event: ReactPointerEvent<HTMLLabelElement>) => void;
}): ReactElement => {
  const { inputRef, isEditing, leave, start, startFromPointer, wrapRef } =
    useSizeEdit(mode);

  if (mode === "fixed" || isEditing) {
    return (
      <SizeEditor
        axis={axis}
        edit={edit}
        wrapRef={wrapRef}
        inputRef={inputRef}
        onLeave={leave}
      />
    );
  }

  return (
    <SizeSummary
      axis={axis}
      label={toModeLabel(mode)}
      px={toRoundedPx(used)}
      onDrag={onDrag}
      onStart={start}
      onStartPointer={startFromPointer}
    />
  );
};

export { SizeValue };
