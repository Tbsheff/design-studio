import type { DesignSystemCheckResult } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { REGION_ROLE } from "./aria-role-model.js";
import { CheckProblemGroup } from "./check-problem-group.js";
import { copy } from "./copy.js";
import { groupProblems } from "./draft-improve-model.js";

interface CheckProblemsProps {
  readonly check: DesignSystemCheckResult;
  readonly id: string;
  readonly note: string | null;
}

const CheckProblems = ({
  check,
  id,
  note,
}: CheckProblemsProps): ReactElement => (
  <div
    className="draft-problems"
    id={id}
    role={REGION_ROLE}
    aria-label={copy.designSystemCheck}
  >
    {note && <p className="draft-problems-note">{note}</p>}
    {groupProblems(check.problems).map((group) => (
      <CheckProblemGroup key={group.rule} group={group} />
    ))}
    <p className="draft-problems-hint">{copy.improveWithAiFills}</p>
  </div>
);

export { CheckProblems };
