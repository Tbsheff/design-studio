import type { DesignSystemCoverage } from "@design-studio/contracts";
import type { ReactElement, Ref } from "react";

import { DIALOG_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { toCoverageNote } from "./coverage-note-model.js";
import { GRADE_LABELS } from "./draft-bar-model.js";

interface CoveragePopProps {
  readonly coverage: DesignSystemCoverage;
  readonly id: string;
  readonly popRef: Ref<HTMLDivElement>;
}

const CoveragePop = ({
  coverage,
  id,
  popRef,
}: CoveragePopProps): ReactElement => {
  const note = toCoverageNote(coverage);

  return (
    <div
      ref={popRef}
      id={id}
      className="ui-popover draft-coverage-pop"
      role={DIALOG_ROLE}
      aria-label={copy.coverageDetails}
    >
      <strong>
        {coverage.score}
        {copy.n100Plain}
        {GRADE_LABELS[coverage.grade]}
      </strong>
      <p>{copy.coverageExplain}</p>
      <p>{note.found}</p>
      {note.base && <p>{note.base}</p>}
      {note.guessed && <p>{note.guessed}</p>}
      <p className="draft-coverage-next">{note.next}</p>
    </div>
  );
};

export { CoveragePop };
