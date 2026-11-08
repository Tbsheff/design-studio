import type { RunLevel } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { levelLabel } from "./level-control.js";

const LevelChip = ({
  level,
}: {
  level: RunLevel | null;
}): ReactElement | null => {
  if (!level) {
    return null;
  }

  return (
    <span className={`ui-chip level-tag ${level}`} data-testid="run-level-chip">
      {levelLabel(level)}
    </span>
  );
};

export { LevelChip };
