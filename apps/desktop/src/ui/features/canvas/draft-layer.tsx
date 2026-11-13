import type { ReactElement } from "react";

import type { CanvasStageProps } from "./canvas-stage-types.js";
import { copy } from "./copy.js";
import {
  toEditLayerHtml,
  toFrontSrc,
  toPageFile,
} from "./draft-frame-model.js";
import { DraftLayerBar } from "./draft-layer-bar.js";
import { useDraftEdit, useDraftSlots } from "./use-draft-frame.js";

type DraftLayerProps = Pick<CanvasStageProps, "preview" | "props" | "stage">;

const DraftLayer = ({
  preview,
  props,
  stage,
}: DraftLayerProps): ReactElement | null => {
  const { covered, frames } = preview;

  const edit = useDraftEdit({
    directionId: props.directionId || null,
    frontToken: frames.frontToken,
    projectId: props.projectId,
  });

  const html = toEditLayerHtml(
    edit.draft,
    toPageFile(stage.active.path),
    toFrontSrc(frames.slots, frames.frontToken)
  );

  const slots = useDraftSlots(html);
  const [first, second] = slots.docs;

  if (covered || edit.draft === null || edit.draft.path === null) {
    return null;
  }

  return (
    <output
      className="draft-frame draft-layer"
      aria-live="polite"
      data-landed={edit.isLanded}
      data-solo={html === null}
      data-testid="draft-layer"
    >
      {html !== null && first !== null && (
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
      {html !== null && second !== null && (
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
      <DraftLayerBar draft={edit.draft} />
    </output>
  );
};

export { DraftLayer };
