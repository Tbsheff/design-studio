import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { SkillChipRemove } from "./skill-chip-remove.js";
import { skillDisplayName } from "./skills-model.js";

const BOOK_ICON_SIZE = 12;

const SkillChip = ({
  id,
  onRemove,
}: {
  id: string;
  onRemove: (id: string) => void;
}): ReactElement => (
  <span
    className="skill-chip"
    data-tip-side="top"
    data-tip={`The agent will use the ${id} skill`}
  >
    <Icon name="book" size={BOOK_ICON_SIZE} />
    {skillDisplayName(id)}
    <SkillChipRemove id={id} onRemove={onRemove} />
  </span>
);

export { SkillChip };
