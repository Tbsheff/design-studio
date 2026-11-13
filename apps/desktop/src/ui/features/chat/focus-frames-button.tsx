import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toFramesLabel, toFramesTip } from "./run-focus-model.js";
import type { FrameFocus } from "./run-focus-model.js";

const FocusFramesButton = ({
  frames,
  onAdd,
}: {
  frames: FrameFocus;
  onAdd: () => void;
}): ReactElement => (
  <button
    type="button"
    className="skill-chip focus-add"
    data-tip-side="top"
    data-tip={toFramesTip(frames)}
    data-testid="focus-add-frames"
    onClick={onAdd}
  >
    <Icon name="frame" size={12} />
    {toFramesLabel(frames)}
  </button>
);

export { FocusFramesButton };
