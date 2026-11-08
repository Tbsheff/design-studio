import type { DesignSystemCheckResult } from "@design-studio/contracts";
import { useFitPopover } from "@design-studio/ui";
import { useCallback, useId, useRef, useState } from "react";
import type { ReactElement } from "react";

import { STATUS_ROLE } from "./aria-role-model.js";
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
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useFitPopover(listRef, toggleRef, isOpen);

  const onToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  if (!check) {
    return null;
  }

  if (check.passed) {
    return (
      <span className="draft-check passed" role={STATUS_ROLE}>
        {copy.checkPassed}
      </span>
    );
  }

  const count = check.problems.length;

  return (
    <span className="draft-check failed">
      <button
        ref={toggleRef}
        type="button"
        className="draft-check-toggle"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={onToggle}
      >
        {count}
        {copy.problem}
        {toPlural(count)}
      </button>
      {isOpen && (
        <CheckProblems
          listRef={listRef}
          check={check}
          id={listId}
          note={runNote(run)}
        />
      )}
    </span>
  );
};

export { CheckStatus };
