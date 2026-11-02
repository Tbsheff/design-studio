import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { IconPickerProps } from "./icon-picker.js";

const IconPicker = lazy(async () => {
  const loaded = await import("./icon-picker.js");

  return { default: loaded.IconPicker };
});

const IconSlot = ({
  directionId,
  mode,
  onClose,
  onDone,
  projectId,
  target,
}: IconPickerProps): ReactElement => (
  <Suspense fallback={null}>
    <IconPicker
      directionId={directionId}
      mode={mode}
      projectId={projectId}
      target={target}
      onClose={onClose}
      onDone={onDone}
    />
  </Suspense>
);

export { IconSlot };
