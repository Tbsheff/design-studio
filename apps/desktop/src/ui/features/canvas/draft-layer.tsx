import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { CanvasStageProps } from "./canvas-stage-types.js";
import { copy } from "./copy.js";
import {
  toEditLayerHtml,
  toFrontSrc,
  toPageFile,
} from "./draft-frame-model.js";
import { DraftLayerBar } from "./draft-layer-bar.js";
import { toPassiveStyle } from "./passive-frame-model.js";
import { useDraftEdit, useDraftSlots } from "./use-draft-frame.js";

type DraftLayerProps = Pick<CanvasStageProps, "preview" | "props" | "stage">;

type StageView = DraftLayerProps["stage"];

interface DraftPlace {
  readonly isShown: boolean;
  readonly path: string | undefined;
  readonly style: CSSProperties;
}

const toDraftPlace = (
  active: StageView["active"],
  shown: StageView["shown"],
  frameId: string | null
): DraftPlace => {
  if (frameId === null || frameId === active.id) {
    return { isShown: true, path: active.path, style: {} };
  }

  const target = shown.find((frame) => frame.id === frameId);

  if (!target) {
    return { isShown: false, path: active.path, style: {} };
  }

  return {
    isShown: true,
    path: target.path,
    style: toPassiveStyle(target, active),
  };
};

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

  const place = useMemo(
    () => toDraftPlace(stage.active, stage.shown, edit.frameId),
    [stage.active, stage.shown, edit.frameId]
  );

  const html = toEditLayerHtml(
    edit.draft,
    toPageFile(place.path),
    toFrontSrc(frames.slots, frames.frontToken)
  );

  const slots = useDraftSlots(html);
  const [first, second] = slots.docs;

  if (
    covered ||
    !place.isShown ||
    edit.draft === null ||
    edit.draft.path === null
  ) {
    return null;
  }

  return (
    <output
      className="draft-frame draft-layer"
      style={place.style}
      aria-live="polite"
      data-landed={edit.isLanded}
      data-ready={slots.isReady}
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
