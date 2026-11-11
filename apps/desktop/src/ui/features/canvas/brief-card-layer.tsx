import type { ReactElement } from "react";

import type { BriefDraft, VariationsState } from "./use-variations.js";
import { VariationBriefCard } from "./variation-brief-card.js";

interface BriefCardLayerProps {
  readonly draft: BriefDraft;
  readonly state: VariationsState;
}

const BriefCardLayer = ({
  draft,
  state,
}: BriefCardLayerProps): ReactElement => {
  const { editBrief: onEdit, removeBrief: onRemove } = state;
  const { start: onStart, skip: onSkip, dismiss: onDismiss } = state;

  return (
    <div className="variation-card-layer">
      <VariationBriefCard
        draft={draft}
        onEdit={onEdit}
        onRemove={onRemove}
        onStart={onStart}
        onSkip={onSkip}
        onDismiss={onDismiss}
      />
    </div>
  );
};

export { BriefCardLayer };
