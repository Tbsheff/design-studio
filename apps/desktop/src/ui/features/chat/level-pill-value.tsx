import type { RunLevel } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { levelLabel } from "./level-model.js";

const LEVEL_ICON = 14;

const LevelPillValue = ({ level }: { level: RunLevel }): ReactElement => (
  <>
    <span className="level-full">{levelLabel(level)}</span>
    <span className="level-short">
      <Icon name="sliders" size={LEVEL_ICON} />
    </span>
  </>
);

export { LevelPillValue };
