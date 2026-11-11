import type { ReactElement } from "react";

import { toDraftsLabel } from "../../domain/draft-counts.js";
import { copy } from "./copy.js";
import type { BriefDraft } from "./use-variations.js";
import { VariationNotice } from "./variation-notice.js";

const DraftStatus = ({
  draft,
  onDismiss,
}: {
  readonly draft: BriefDraft;
  readonly onDismiss: () => void;
}): ReactElement => (
  <VariationNotice
    onDismiss={onDismiss}
    testId="draft-status"
    text={`${copy.writing}${toDraftsLabel(draft.count)}${copy.ellipsis}`}
  />
);

export { DraftStatus };
