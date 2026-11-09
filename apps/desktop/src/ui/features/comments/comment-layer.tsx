import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";

import { drawingAnchor } from "./comment-layer-model.js";
import type { Rect } from "./comment-layer-model.js";
import type { CommentTools, Props } from "./comment-layer-types.js";
import { CommentModePill } from "./comment-mode-pill.js";
import { CommentPin } from "./comment-pin.js";
import { useProfileInitial } from "./deps.js";
import type { DesignComment } from "./deps.js";
import { FeedbackComposer } from "./feedback-composer.js";
import { OpenCommentSlot } from "./open-comment-slot.js";
import { PickComposer } from "./pick-composer.js";
import { useAnchorTracking } from "./use-anchor-tracking.js";
import type { AnchorRects } from "./use-anchor-tracking.js";
import { useFeedbackPrompt } from "./use-feedback-prompt.js";
import { usePick } from "./use-pick.js";
import { useShownComments } from "./use-shown-comments.js";
import { useStableQueries } from "./use-stable-queries.js";

const toRect = (
  comment: DesignComment,
  rects: AnchorRects
): Rect | undefined => {
  if (comment.drawing) {
    return drawingAnchor(comment.drawing);
  }

  return rects.get(comment.id);
};

const CommentLayer = (props: Props): ReactElement => {
  const { control, frame, tools, zoom } = props;
  const initial = useProfileInitial();
  const { pick, pickOffset, setPick } = usePick();
  const shown = useShownComments(control, props.activeFrame ?? null);
  const tracked = useMemo(() => shown.filter((item) => !item.drawing), [shown]);
  const queries = useStableQueries(tracked);

  const { commentMode, frames, isFrameReady, kind, onExitCommentMode } = props;

  const rects = useAnchorTracking({
    commentMode,
    control,
    frames,
    isFrameReady,
    kind,
    onExitCommentMode,
    queries,
    setPick,
  });

  const feedback = useFeedbackPrompt(props);

  const pinned = useMemo(
    () => shown.filter((item) => item.status !== "orphaned"),
    [shown]
  );

  const shared = useMemo(
    () => ({ control, frame, initial, tools, zoom }),
    [control, frame, initial, tools, zoom]
  );

  useEffect(() => {
    if (!commentMode) {
      setPick(null);
    }
  }, [commentMode, setPick]);

  return (
    <>
      {pinned.map((item) => (
        <CommentPin
          key={item.id}
          comment={item}
          control={control}
          frame={frame}
          initial={initial}
          rect={toRect(item, rects)}
          zoom={zoom}
        />
      ))}
      {pick && (
        <PickComposer
          offset={pickOffset}
          pick={pick}
          setPick={setPick}
          shared={shared}
        />
      )}
      {feedback.isOpen && !pick && (
        <FeedbackComposer
          feedback={feedback}
          selection={props.selection}
          shared={shared}
        />
      )}
      <OpenCommentSlot rects={rects} shared={shared} />
    </>
  );
};

export { CommentLayer, CommentModePill };

export type { CommentTools };
