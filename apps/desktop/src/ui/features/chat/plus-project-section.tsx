import type { ReactElement } from "react";

import type { PlusProjectProps } from "./composer-sheet-model.js";
import { copy } from "./copy.js";
import { MenuItem } from "./menu-item.js";
import { MenuSection } from "./menu-section.js";

const PlusProjectSection = ({
  project,
  onAct,
}: {
  readonly project: PlusProjectProps | null;
  readonly onAct: (run: () => void) => () => void;
}): ReactElement | null => {
  if (project === null) {
    return null;
  }

  return (
    <MenuSection label={copy.projectSettings}>
      <MenuItem
        icon="check"
        label={copy.skillsOnOff}
        meta={project.skillsCount ?? ""}
        onPick={onAct(project.onSkillList)}
      />
    </MenuSection>
  );
};

export { PlusProjectSection };
