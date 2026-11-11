import type { DesignSystemCheckResult } from "@design-studio/contracts";
import { useId } from "react";
import type { ReactElement } from "react";

import { CheckProblems } from "./check-problems.js";
import { copy } from "./copy.js";
import { runNote } from "./draft-improve-model.js";
import { toPlural } from "./plural-model.js";
import type { RunView } from "./run-state-model.js";

interface CheckStatusProps {
  readonly check: DesignSystemCheckResult | null;
  readonly run: RunView | null;
}

const CheckStatus = ({ check, run }: CheckStatusProps): ReactElement | null => {
  const listId = useId();

  if (!check) {
    return null;
  }

  if (check.passed) {
    return <p className="draft-status passed">{copy.checkPassed}</p>;
  }

  const count = check.problems.length;

  return (
    <div className="draft-status-block">
      <p className="draft-status failed">
        {count}
        {copy.problem}
        {toPlural(count)}
      </p>
      <CheckProblems check={check} id={listId} note={runNote(run)} />
    </div>
  );
};

export { CheckStatus };
