import type { ReactElement } from "react";

import { copy } from "./copy.js";
import {
  isUnderKilobyte,
  toDraftBytes,
  toFileName,
  toKilobytes,
} from "./draft-frame-model.js";
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

const toSizeText = (bytes: number): string => {
  if (isUnderKilobyte(bytes)) {
    return `${bytes}${copy.draftBytes}`;
  }

  return `${toKilobytes(bytes)}${copy.draftKb}`;
};

const DraftLayerBar = ({ draft }: DraftLayerBarProps): ReactElement => (
  <div className="draft-frame-bar">
    <span className="spinner" aria-hidden="true" />
    <span className="draft-frame-text">
      {toVerb(draft)}
      {toFileName(draft.path ?? "")}
      {copy.draftDot}
      {toSizeText(toDraftBytes(draft))}
    </span>
  </div>
);

export { DraftLayerBar };
