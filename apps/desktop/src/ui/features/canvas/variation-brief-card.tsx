import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { BriefCardBody } from "./brief-card-body.js";
import { BriefCardFoot } from "./brief-card-foot.js";
import { BriefCardHead } from "./brief-card-head.js";
import type { BriefPatch } from "./brief-row.js";
import type { BriefDraft } from "./use-variations.js";

interface VariationBriefCardProps {
  readonly project: Project;
  readonly draft: BriefDraft;
  readonly onEdit: (index: number, patch: BriefPatch) => void;
  readonly onRemove: (index: number) => void;
  readonly onStart: () => void;
  readonly onSkip: () => void;
  readonly onDismiss: () => void;
}

const VariationBriefCard = ({
  project,
  draft,
  onEdit,
  onRemove,
  onStart,
  onSkip,
  onDismiss,
}: VariationBriefCardProps): ReactElement => {
  const count = draft.briefs?.length ?? draft.count;

  return (
    <dialog
      open
      className="variation-card"
      aria-modal="false"
      aria-labelledby="variation-card-title"
      data-testid="variation-brief-card"
    >
      <BriefCardHead draft={draft} count={count} onDismiss={onDismiss} />
      <BriefCardBody draft={draft} onEdit={onEdit} onRemove={onRemove} />
      {draft.result?.error && (
        <p className="alert inline variation-card-note">{draft.result.error}</p>
      )}
      {draft.error && (
        <p className="alert error variation-card-note" role="alert">
          {draft.error}
        </p>
      )}
      <BriefCardFoot
        project={project}
        draft={draft}
        count={count}
        onStart={onStart}
        onSkip={onSkip}
      />
    </dialog>
  );
};

export { VariationBriefCard };
