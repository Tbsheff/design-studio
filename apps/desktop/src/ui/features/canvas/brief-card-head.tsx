import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { BriefDraft } from "./use-variations.js";

interface CardHeadProps {
  readonly draft: BriefDraft;
  readonly count: number;
  readonly onDismiss: () => void;
}

const toHeading = (draft: BriefDraft): string => {
  if (draft.element) {
    return "Element variants";
  }

  return "Directions to try";
};

const toPromptText = (draft: BriefDraft, count: number): string => {
  if (draft.element) {
    return `${count} versions of the ${draft.element.tag}: “${draft.prompt}”`;
  }

  return `${count} designs for “${draft.prompt}”`;
};

const BriefCardHead = ({
  draft,
  count,
  onDismiss,
}: CardHeadProps): ReactElement => (
  <header className="variation-card-head">
    <div
      className="variation-card-heading"
      data-tip={draft.prompt}
      data-tip-align="start"
    >
      <h2 id="variation-card-title">{toHeading(draft)}</h2>
      <p className="variation-card-prompt truncate">
        {toPromptText(draft, count)}
      </p>
    </div>
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.closeDirections}
      onClick={onDismiss}
      disabled={draft.starting}
    >
      <Icon name="close" size={14} />
    </button>
  </header>
);

export { BriefCardHead };
