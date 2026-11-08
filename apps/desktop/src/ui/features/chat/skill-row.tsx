import type { SkillInfo } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { SkillText } from "./skill-text.js";

interface SkillRowProps {
  readonly allowBash: boolean;
  readonly isOn: boolean;
  readonly onToggle: (id: string, isOn: boolean) => void;
  readonly skill: SkillInfo;
}

const SkillRow = ({
  skill,
  isOn,
  allowBash,
  onToggle,
}: SkillRowProps): ReactElement => {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onToggle(skill.id, event.target.checked);
    },
    [onToggle, skill.id]
  );

  return (
    <label className="check skill-row" data-tip={skill.sourcePath}>
      <input
        type="checkbox"
        aria-label={`Skill ${skill.id}`}
        checked={isOn}
        onChange={onChange}
      />
      <SkillText skill={skill} allowBash={allowBash} />
    </label>
  );
};

export { SkillRow };
