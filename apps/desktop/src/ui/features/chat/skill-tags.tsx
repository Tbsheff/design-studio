import type { SkillInfo } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface SkillTagsProps {
  readonly allowBash: boolean;
  readonly skill: SkillInfo;
}

const SkillTags = ({ skill, allowBash }: SkillTagsProps): ReactElement => (
  <>
    {skill.needsBash && !allowBash && (
      <span className="skill-tag" data-tip={copy.thisSkillRuns}>
        {copy.needsShell}
      </span>
    )}
    {!skill.modelInvocable && (
      <span
        className="skill-tag muted-tag"
        data-tip-align="end"
        data-tip={copy.skillMdSets}
      >
        {copy.manualOnly}
      </span>
    )}
  </>
);

export { SkillTags };
