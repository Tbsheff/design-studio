import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toFileName, toKilobytes } from "./draft-frame-model.js";
import type { RunDraftWire } from "./draft-frame-model.js";

interface DraftLayerBarProps {
  readonly draft: RunDraftWire;
}

const toVerb = (draft: RunDraftWire): string => {
  if (draft.kind === "edit") {
    return copy.draftEditing;
  }

  return copy.draftWriting;
};

const DraftLayerBar = ({ draft }: DraftLayerBarProps): ReactElement => (
  <div className="draft-frame-bar">
    <span className="spinner" aria-hidden="true" />
    <span className="draft-frame-text">
      {toVerb(draft)}
      {toFileName(draft.path ?? "")}
      {copy.draftDot}
      {toKilobytes(draft.bytes)}
      {copy.draftKb}
    </span>
  </div>
);

export { DraftLayerBar };
