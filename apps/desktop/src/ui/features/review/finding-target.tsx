import type { ReviewFinding } from "@design-studio/contracts/review";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { SEVERITY_WORD } from "./review-model.js";

const IMAGE_ROLE = "img";

interface FindingTargetProps {
  readonly finding: ReviewFinding;
  readonly onSelect: (finding: ReviewFinding) => void;
}

const FindingTarget = ({
  finding,
  onSelect,
}: FindingTargetProps): ReactElement => {
  const selectFinding = useCallback((): void => {
    onSelect(finding);
  }, [finding, onSelect]);

  const hasCopies =
    Boolean(finding.copies) &&
    (finding.copies ?? 0) > 1 &&
    !finding.element.startsWith("in ");

  return (
    <button
      type="button"
      className="review-target"
      disabled={!finding.selector}
      data-tip={pick(Boolean(finding.selector), copy.selectOnCanvas, null)}
      onClick={selectFinding}
    >
      <span
        role={IMAGE_ROLE}
        className={`review-sev ${finding.severity}`}
        aria-label={SEVERITY_WORD.get(finding.severity)}
      />
      <span className="truncate">{finding.element}</span>
      {hasCopies && (
        <span className="review-copies">
          {`${finding.copies}${copy.copies}`}
        </span>
      )}
      {finding.shared && <span className="review-copies">{copy.shared}</span>}
    </button>
  );
};

export { FindingTarget };
