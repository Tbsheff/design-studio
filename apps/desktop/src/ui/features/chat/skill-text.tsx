import type { SkillInfo } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SkillTags } from "./skill-tags.js";

interface SkillTextProps {
  readonly allowBash: boolean;
  readonly skill: SkillInfo;
}

const SkillText = ({ skill, allowBash }: SkillTextProps): ReactElement => (
  <span className="skill-text">
    <span className="skill-name">
      {skill.name}
      <SkillTags skill={skill} allowBash={allowBash} />
    </span>
    <span className="skill-desc">{skill.description}</span>
  </span>
);

export { SkillText };
