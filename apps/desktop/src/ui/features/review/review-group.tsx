import { REVIEW_KIND_LABEL } from "@design-studio/contracts/review";
import type {
  ReviewFinding,
  ReviewKind,
} from "@design-studio/contracts/review";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { FindingRow } from "./finding-row.js";
import { GroupFixAll } from "./group-fix-all.js";
import type { ReviewActions } from "./review-model.js";

interface ReviewGroupProps {
  readonly kind: ReviewKind;
  readonly list: readonly ReviewFinding[];
  readonly actions: ReviewActions;
}

const ReviewGroup = ({
  actions,
  kind,
  list,
}: ReviewGroupProps): ReactElement => {
  const fixable = useMemo(() => list.filter((finding) => finding.fix), [list]);

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
        {list.map((finding) => (
          <FindingRow key={finding.id} finding={finding} actions={actions} />
        ))}
      </ul>
    </section>
  );
};

export { ReviewGroup };
