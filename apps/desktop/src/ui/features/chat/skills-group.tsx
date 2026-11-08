import type { SkillInfo } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { GROUP_ROLE } from "./aria-role-model.js";
import { SkillRow } from "./skill-row.js";
import { originLabel } from "./skills-checklist-model.js";

interface SkillsGroupProps {
  readonly allowBash: boolean;
  readonly disabled: ReadonlySet<string>;
  readonly items: SkillInfo[];
  readonly onToggle: (id: string, isOn: boolean) => void;
  readonly origin: string;
}

const SkillsGroup = ({
  origin,
  items,
  disabled,
  allowBash,
  onToggle,
}: SkillsGroupProps): ReactElement => (
  <div
    className="skills-group"
    role={GROUP_ROLE}
    aria-label={originLabel(origin)}
  >
    <span className="skills-group-head">{originLabel(origin)}</span>
    {items.map((skill) => (
      <SkillRow
        key={skill.id}
        skill={skill}
        isOn={!disabled.has(skill.id)}
        allowBash={allowBash}
        onToggle={onToggle}
      />
    ))}
  </div>
);

export { SkillsGroup };
