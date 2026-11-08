import type { SkillInfo } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SkillsGroup } from "./skills-group.js";

interface SkillsListProps {
  readonly allowBash: boolean;
  readonly disabled: ReadonlySet<string>;
  readonly groups: [string, SkillInfo[]][];
  readonly onToggle: (id: string, isOn: boolean) => void;
}

const SkillsList = ({
  groups,
  disabled,
  allowBash,
  onToggle,
}: SkillsListProps): ReactElement => (
  <div className="skills-list">
    {groups.map(([origin, items]) => (
      <SkillsGroup
        key={origin}
        origin={origin}
        items={items}
        disabled={disabled}
        allowBash={allowBash}
        onToggle={onToggle}
      />
    ))}
    {groups.length === 0 && <p className="skills-note">{copy.noSkillsMatch}</p>}
  </div>
);

export { SkillsList };
