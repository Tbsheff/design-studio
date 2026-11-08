import type { DesignSystemCoverage } from "@design-studio/contracts";
import { useFitPopover } from "@design-studio/ui";
import { useCallback, useId, useRef, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CoveragePop } from "./coverage-pop.js";
import { GRADE_LABELS } from "./draft-bar-model.js";
import { useDismissPopover } from "./use-dismiss-popover.js";

const CoverageNote = ({
  coverage,
}: {
  coverage: DesignSystemCoverage;
}): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();
  useFitPopover(popRef, toggleRef, isOpen);

  const onClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const onToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  useDismissPopover(isOpen, popRef, toggleRef, onClose);

  return (
    <span className="draft-coverage">
      <button
        ref={toggleRef}
        type="button"
        className="draft-grade"
        aria-expanded={isOpen}
        aria-controls={popId}
        aria-label={`Coverage ${coverage.score} of 100, ${GRADE_LABELS[coverage.grade]}. Explain`}
        onClick={onToggle}
      >
        {copy.coverage}
        {coverage.score}
        {copy.n100}
        {GRADE_LABELS[coverage.grade]}
      </button>
      {isOpen && <CoveragePop coverage={coverage} id={popId} popRef={popRef} />}
    </span>
  );
};

export { CoverageNote };
