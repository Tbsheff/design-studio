import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SkillChip } from "./skill-chip.js";

const SkillChips = ({
  ids,
  onRemove,
}: {
  ids: string[];
  onRemove: (id: string) => void;
}): ReactElement | null => {
  if (ids.length === 0) {
    return null;
  }

  return (
    <fieldset className="skill-chips" aria-label={copy.skillsForThis}>
      {ids.map((id) => (
        <SkillChip key={id} id={id} onRemove={onRemove} />
      ))}
    </fieldset>
  );
};

export { SkillChips };
