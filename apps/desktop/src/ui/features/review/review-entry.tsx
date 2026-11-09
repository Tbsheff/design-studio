import { Suspense } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

import type { ParentMessageBody } from "../../platform/bridge.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import { frameName } from "../canvas/index.js";
import { CritiquePanel } from "../critique/index.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { KitDriftPanel } from "../kit-drift/index.js";
import { ReviewEntryButton } from "./review-entry-button.js";
import { ReviewEntryPanel } from "./review-entry-panel.js";
import { useReviewEntry } from "./use-review-entry.js";
import { useReviewSlot } from "./use-review-slot.js";
import { WalkthroughSection } from "./walkthrough-section.js";

interface Props {
  projectId: string;
  directionId: string | null;
  frame: CanvasFrame;
  live: boolean;
  running?: boolean;
  lastChange: FilesChange | null;
  post: (body: ParentMessageBody) => void;
  shell?: {
    onAskAgent?: (text: string) => void;
    renderSpeed?:
      | ((scope: {
          readonly directionId: string | null;
          readonly frameId: string;
          readonly isLive: boolean;
          readonly projectId: string;
        }) => ReactNode)
      | null;
  };
  toolKey: string;
}

const labelOf = (frame: CanvasFrame): string =>
  [frame.label ?? frameName(frame), frame.path].filter(Boolean).join(" · ");

const ReviewEntry = (props: Props): ReactElement => {
  const { markerRef, slot } = useReviewSlot();
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
      <KitDriftPanel onSelect={selectSelector} scope={props} />
    </Suspense>
  );

  const speed =
    props.shell?.renderSpeed?.({
      directionId,
      frameId: frame.id,
      isLive: live,
      projectId,
    }) ?? null;

  const walkthrough = (
    <WalkthroughSection
      directionId={directionId}
      frameId={frame.id}
      isLive={live}
      projectId={projectId}
    />
  );

  let panel: ReactElement | null = null;

  if (isOpen) {
    panel = (
      <ReviewEntryPanel
        review={review}
        frameLabel={labelOf(frame)}
        live={live}
        running={props.running === true}
        canAsk={Boolean(ask)}
        onSelect={select}
        onAsk={askAgent}
        onClose={close}
        speed={speed}
      >
        {critique}
        {walkthrough}
      </ReviewEntryPanel>
    );
  }

  return (
    <>
      <span ref={markerRef} hidden />
      {slot && createPortal(button, slot)}
      {panel}
    </>
  );
};

export { ReviewEntry };
