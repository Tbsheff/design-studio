import { RUN_LEVELS } from "@design-studio/contracts";
import type { RunLevel } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { LevelChoice } from "./level-choice.js";
import { MenuSection } from "./menu-section.js";

const LevelMenuBody = ({
  level,
  onLevel,
  onClose,
}: {
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  onClose: (refocus: boolean) => void;
}): ReactElement => (
  <MenuSection label="Level">
    {RUN_LEVELS.map((item) => (
      <LevelChoice
        key={item}
        item={item}
        isChecked={level === item}
        onLevel={onLevel}
        onClose={onClose}
      />
    ))}
  </MenuSection>
);

export { LevelMenuBody };
