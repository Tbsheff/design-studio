import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import type { RefObject, ReactElement } from "react";
import { createPortal } from "react-dom";

import type { ParentMessageBody } from "../../platform/bridge.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import { frameName } from "../canvas/index.js";
import { CritiquePanel } from "../critique/index.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { ReviewEntryButton } from "./review-entry-button.js";
import { useReviewEntry } from "./use-review-entry.js";

import "../../styles/review.css";

const ReviewPanel = lazy(async () => {
  const loaded = await import("./review-panel.js");

  return { default: loaded.ReviewPanel };
});

interface Props {
  projectId: string;
  directionId: string | null;
  frame: CanvasFrame;
  live: boolean;
  running?: boolean;
  lastChange: FilesChange | null;
  post: (body: ParentMessageBody) => void;
  shell?: { onAskAgent?: (text: string) => void };
  toolKey: string;
}

const labelOf = (frame: CanvasFrame): string =>
  [frame.label ?? frameName(frame), frame.path].filter(Boolean).join(" · ");

const useSlot = (
  marker: RefObject<HTMLSpanElement | null>
): HTMLElement | null => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const found =
      marker.current
        ?.closest(".canvas")
        ?.querySelector<HTMLElement>('[data-topbar-slot="review"]') ?? null;

    if (found !== slot) {
      setSlot(found);
    }
  });

  return slot;
};

const ReviewEntry = (props: Props): ReactElement => {
  const marker = useRef<HTMLSpanElement>(null);
  const slot = useSlot(marker);
  const { directionId, frame, live, projectId } = props;
  const ask = props.shell?.onAskAgent;

  const {
    askAgent,
    close,
    count,
    isOpen,
    review,
    select,
    selectSelector,
    toggle,
  } = useReviewEntry(props);

  const button = (
    <ReviewEntryButton
      count={count}
      isBusy={review.busy}
      isDisabled={!directionId}
      isOpen={isOpen}
      isStale={review.stale}
      result={review.result}
      onToggle={toggle}
    />
  );

  const critique = (
    <Suspense fallback={null}>
      <CritiquePanel
        directionId={directionId}
        frameId={frame.id}
        isLive={live}
        onSelect={selectSelector}
        projectId={projectId}
      />
    </Suspense>
  );

  const panel = (
    <Suspense fallback={null}>
      <ReviewPanel
        review={review}
        frameLabel={labelOf(frame)}
        live={live}
        running={props.running === true}
        canAsk={Boolean(ask)}
        onSelect={select}
        onAsk={askAgent}
        onClose={close}
      >
        {critique}
      </ReviewPanel>
    </Suspense>
  );

  return (
    <>
      <span ref={marker} hidden />
      {slot && createPortal(button, slot)}
      {isOpen && panel}
    </>
  );
};

export { ReviewEntry };
