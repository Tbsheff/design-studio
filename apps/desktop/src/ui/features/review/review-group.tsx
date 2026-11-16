import { REVIEW_KIND_LABEL } from "@design-studio/contracts/review";
import type {
  ReviewFinding,
  ReviewKind,
} from "@design-studio/contracts/review";
import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { FindingRow } from "./finding-row.js";
import { GroupFixAll } from "./group-fix-all.js";
import { ReviewGroupSummary } from "./review-group-summary.js";
import type { ReviewActions } from "./review-model.js";

interface ReviewGroupProps {
  readonly kind: ReviewKind;
  readonly list: readonly ReviewFinding[];
  readonly actions: ReviewActions;
}

const isFolded = (kind: ReviewKind, count: number): boolean =>
  kind === "tap-target" && count > 1;

const ReviewGroup = ({
  actions,
  kind,
  list,
}: ReviewGroupProps): ReactElement => {
  const fixable = useMemo(() => list.filter((finding) => finding.fix), [list]);
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback((): void => setIsOpen((open) => !open), []);
  const isFoldable = isFolded(kind, list.length);
  const isListShown = !isFoldable || isOpen;

  return (
    <section className="review-group" aria-label={REVIEW_KIND_LABEL[kind]}>
      <div className="review-group-head">
        <span className="review-group-name">{REVIEW_KIND_LABEL[kind]}</span>
        <span className="review-count num">{list.length}</span>
        <div className="spacer" />
        {fixable.length > 1 && (
          <GroupFixAll fixable={fixable} actions={actions} />
        )}
      </div>
      <ul className="review-list">
        {isFoldable && (
          <ReviewGroupSummary
            count={list.length}
            isOpen={isOpen}
            onToggle={toggle}
          />
        )}
        {isListShown &&
          list.map((finding) => (
            <FindingRow key={finding.id} finding={finding} actions={actions} />
          ))}
      </ul>
    </section>
  );
};

export { ReviewGroup };
