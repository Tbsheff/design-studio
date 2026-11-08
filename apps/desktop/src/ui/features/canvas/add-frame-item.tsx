import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { FRAME_PRESETS } from "./canvas-frame-ops.js";
import { copy } from "./copy.js";

const AddFrameItem = ({
  preset,
  pick,
}: {
  preset: (typeof FRAME_PRESETS)[number];
  pick: (size: { width: number; height: number }) => void;
}): ReactElement => {
  const { height, width } = preset;

  const choose = useCallback(
    () => pick({ height, width }),
    [pick, height, width]
  );

  return (
    <button type="button" role="menuitem" onClick={choose}>
      <Icon name={preset.preset} size={14} />
      <span>{preset.label}</span>
      <kbd aria-hidden="true">
        {width}
        {copy.times2}
        {height}
      </kbd>
    </button>
  );
};

export { AddFrameItem };
