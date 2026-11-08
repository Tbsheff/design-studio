import type { SkillCatalog } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SkillsBar } from "./skills-bar.js";
import {
  groupByOrigin,
  matches,
  toAllToggled,
  toBashNote,
  toggleSkill,
} from "./skills-checklist-model.js";
import { SkillsList } from "./skills-list.js";
import { SkillsProblems } from "./skills-problems.js";

interface SkillsBodyProps {
  readonly allowBash: boolean;
  readonly catalog: SkillCatalog;
  readonly disabled: string[];
  readonly onChange: (next: string[]) => void;
}

const SkillsBody = ({
  catalog,
  disabled,
  allowBash,
  onChange,
}: SkillsBodyProps): ReactElement => {
  const [query, setQuery] = useState("");
  const { skills } = catalog;
  const disabledSet = useMemo(() => new Set(disabled), [disabled]);

  const groups = useMemo(
    () => groupByOrigin(skills.filter((skill) => matches(skill, query))),
    [skills, query]
  );

  const onCount = skills.filter((skill) => !disabledSet.has(skill.id)).length;

  const bashCount = skills.filter(
    (skill) => skill.needsBash && !disabledSet.has(skill.id)
  ).length;

  const onToggle = useCallback(
    (id: string, isOn: boolean): void => {
      onChange(toggleSkill(disabled, id, isOn));
    },
    [disabled, onChange]
  );

  const onSetAll = useCallback(
    (isOn: boolean): void => {
      onChange(toAllToggled(skills, isOn));
    },
    [onChange, skills]
  );

  return (
    <>
      <SkillsBar
        onCount={onCount}
        total={skills.length}
        query={query}
        onQuery={setQuery}
        onSetAll={onSetAll}
      />
      <SkillsList
        groups={groups}
        disabled={disabledSet}
        allowBash={allowBash}
        onToggle={onToggle}
      />
      {!allowBash && bashCount > 0 && (
        <p className="skills-note">{toBashNote(bashCount)}</p>
      )}
      {catalog.problems.length > 0 && (
        <SkillsProblems problems={catalog.problems} />
      )}
      <p className="skills-note">{copy.skillsComeFromClaude}</p>
    </>
  );
};

export { SkillsBody };
