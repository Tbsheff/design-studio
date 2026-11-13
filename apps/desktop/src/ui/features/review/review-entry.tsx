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
import { SpellingGroup } from "./spelling-group.js";
import { toChangeStamp } from "./spelling-model.js";
import { useReviewEntry } from "./use-review-entry.js";
import { useReviewSlot } from "./use-review-slot.js";
import { useSpelling } from "./use-spelling.js";
import type { Spelling } from "./use-spelling.js";
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

const toSpeed = (props: Props): ReactNode =>
  props.shell?.renderSpeed?.({
    directionId: props.directionId,
    frameId: props.frame.id,
    isLive: props.live,
    projectId: props.projectId,
  }) ?? null;

const toExtras = (
  props: Props,
  onSelect: (selector: string) => void,
  spelling: Spelling
): ReactNode => (
  <Suspense fallback={null}>
    <CritiquePanel
      directionId={props.directionId}
      frameId={props.frame.id}
      isLive={props.live}
      onSelect={onSelect}
      projectId={props.projectId}
    />
    <KitDriftPanel onSelect={onSelect} scope={props} />
    <SpellingGroup
      directionId={props.directionId}
      isLive={props.live}
      onSelect={onSelect}
      spelling={spelling}
    />
  </Suspense>
);

const ReviewEntry = (props: Props): ReactElement => {
  const { markerRef, slot } = useReviewSlot();
  const { directionId, frame, live, projectId } = props;

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

  const spelling = useSpelling({
    changeStamp: toChangeStamp(props.lastChange, directionId),
    directionId,
    frameId: frame.id,
    isLive: live && isOpen,
    projectId,
  });

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

  const critique = toExtras(props, selectSelector, spelling);

  const speed = toSpeed(props);

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
        canAsk={Boolean(props.shell?.onAskAgent)}
        onSelect={select}
        onAsk={askAgent}
        onClose={close}
        speed={speed}
        spellingCount={spelling.items.length}
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
