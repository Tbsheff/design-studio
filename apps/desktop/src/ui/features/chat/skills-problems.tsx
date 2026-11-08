import type { SkillCatalog } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { plural } from "./skills-model.js";
import { SkillsProblemItem } from "./skills-problem-item.js";

const CHEVRON_SIZE = 12;

const SkillsProblems = ({
  problems,
}: {
  problems: SkillCatalog["problems"];
}): ReactElement => (
  <details className="skills-problems">
    <summary>
      <Icon name="chevronRight" size={CHEVRON_SIZE} />
      {plural(problems.length, "folder")}
      {copy.didNotLoad}
    </summary>
    <ul>
      {problems.map((problem) => (
        <SkillsProblemItem key={problem.source} problem={problem} />
      ))}
    </ul>
    <p className="skills-note">{copy.fixOrRemoveThe}</p>
  </details>
);

export { SkillsProblems };
