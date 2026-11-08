import type { ReactElement } from "react";

import type { BriefPatch } from "./brief-row.js";
import { BriefRows } from "./brief-rows.js";
import { BriefSkeleton } from "./brief-skeleton.js";
import type { BriefDraft } from "./use-variations.js";

interface CardBodyProps {
  readonly draft: BriefDraft;
  readonly onEdit: (index: number, patch: BriefPatch) => void;
  readonly onRemove: (index: number) => void;
}

const toStatusText = (draft: BriefDraft): string => {
  if (draft.autoStart) {
    return `Writing ${draft.count} directions. The runs start when they are ready.`;
  }

  return `Writing ${draft.count} different directions…`;
};

const BriefCardBody = ({
  draft,
  onEdit,
  onRemove,
}: CardBodyProps): ReactElement | null => {
  if (draft.briefs) {
    return (
      <BriefRows
        briefs={draft.briefs}
        isBusy={draft.starting}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    );
  }

  if (!draft.loading) {
    return null;
  }

  return (
    <>
      <output className="variation-card-status">{toStatusText(draft)}</output>
      <BriefSkeleton count={draft.count} />
    </>
  );
};

export { BriefCardBody };
