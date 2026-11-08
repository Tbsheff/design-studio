import { VARIATION_MIN } from "@design-studio/contracts";
import type { VariationBrief } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { BriefRow } from "./brief-row.js";
import type { BriefPatch } from "./brief-row.js";

interface BriefRowsProps {
  readonly briefs: VariationBrief[];
  readonly isBusy: boolean;
  readonly onEdit: (index: number, patch: BriefPatch) => void;
  readonly onRemove: (index: number) => void;
}

const BriefRows = ({
  briefs,
  isBusy,
  onEdit,
  onRemove,
}: BriefRowsProps): ReactElement => {
  const canRemove = briefs.length > VARIATION_MIN;

  return (
    <ol className="variation-briefs">
      {briefs.map((brief, index) => (
        <BriefRow
          key={brief.label}
          brief={brief}
          index={index}
          isBusy={isBusy}
          canRemove={canRemove}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </ol>
  );
};

export { BriefRows };
