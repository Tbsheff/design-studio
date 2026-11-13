import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toFileName, toKilobytes } from "./draft-frame-model.js";
import type { DraftWrite } from "./draft-frame-model.js";
import { SkeletonPage } from "./frame-skeleton-page.js";
import { useDraftSlots } from "./use-draft-frame.js";

interface DraftFrameProps {
  readonly draft: DraftWrite;
}

const DraftFrame = ({ draft }: DraftFrameProps): ReactElement => {
  const slots = useDraftSlots(draft.html);
  const [first, second] = slots.docs;

  return (
    <output
      className="draft-frame"
      aria-live="polite"
      data-testid="draft-frame"
    >
      {draft.html === null && <SkeletonPage />}
      {first !== null && (
        <iframe
          className="draft-frame-doc"
          data-front={slots.front === 0}
          onLoad={slots.handleFirstLoad}
          sandbox=""
          srcDoc={first}
          tabIndex={-1}
          title={copy.draftPreview}
        />
      )}
      {second !== null && (
        <iframe
          className="draft-frame-doc"
          data-front={slots.front === 1}
          onLoad={slots.handleSecondLoad}
          sandbox=""
          srcDoc={second}
          tabIndex={-1}
          title={copy.draftPreview}
        />
      )}
      <div className="draft-frame-bar">
        <span className="spinner" aria-hidden="true" />
        <span className="draft-frame-text">
          {copy.draftWriting}
          {toFileName(draft.path)}
          {copy.draftDot}
          {toKilobytes(draft.bytes)}
          {copy.draftKb}
        </span>
      </div>
    </output>
  );
};

export { DraftFrame };
