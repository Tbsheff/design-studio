import type { ReactElement } from "react";
import { useMemo } from "react";

import { isVisible, pinTarget } from "./comment-layer-model.js";
import type { FrameSize, Rect } from "./comment-layer-model.js";
import { toWrapClass } from "./comment-pin-model.js";
import { pinPlacement } from "./comment-placement.js";
import type { DesignComment } from "./deps.js";
import { PinButton } from "./pin-button.js";
import { PinTip } from "./pin-tip.js";
import type { CommentsControl } from "./use-comments.js";

const CommentPin = ({
  comment,
  control,
  frame,
  initial,
  rect,
  zoom,
}: {
  comment: DesignComment;
  control: CommentsControl;
  frame: FrameSize;
  initial: string | null;
  rect: Rect | undefined;
  zoom: number;
}): ReactElement | null => {
  const pin = useMemo(() => {
    if (!rect) {
      return null;
    }

    const target = pinTarget(comment, rect, zoom, frame);

    return pinPlacement(target.rect, zoom, frame, target.offset);
  }, [comment, frame, rect, zoom]);

  const style = useMemo(
    () => ({
      left: pin?.left,
      top: pin?.top,
      transform: `scale(${1 / zoom})`,
    }),
    [pin?.left, pin?.top, zoom]
  );

  if (!rect || !pin || !isVisible(rect, frame)) {
    return null;
  }

  if (control.openId === comment.id) {
    return null;
  }

  return (
    <div className={toWrapClass(pin.flip)} style={style}>
      <PinButton
        comment={comment}
        control={control}
        initial={initial}
        isFlipped={pin.flip}
      />
      <PinTip comment={comment} />
    </div>
  );
};

export { CommentPin };
