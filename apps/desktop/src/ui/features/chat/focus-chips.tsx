import type { ReactElement } from "react";

import { GROUP_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { FocusChip } from "./focus-chip.js";
import { FocusFramesButton } from "./focus-frames-button.js";
import { canFocusFrames } from "./run-focus-model.js";
import type { RunFocus } from "./use-run-focus.js";

const FocusChips = ({ focus }: { focus: RunFocus }): ReactElement | null => {
  const { addFrames, frames, paths, remove } = focus;
  const canAddFrames = canFocusFrames(frames, paths);

  if (paths.length === 0 && !canAddFrames) {
    return null;
  }

  return (
    <div className="skill-chips" role={GROUP_ROLE} aria-label={copy.focusFiles}>
      {paths.map((path) => (
        <FocusChip key={path} path={path} onRemove={remove} />
      ))}
      {canAddFrames && frames !== null && (
        <FocusFramesButton frames={frames} onAdd={addFrames} />
      )}
    </div>
  );
};

export { FocusChips };
