import type { ReactElement } from "react";

import type { Rect } from "./comment-layer-model.js";
import type { DesignComment } from "./deps.js";
import type { LayerShared } from "./layer-composer.js";
import { OpenComment } from "./open-comment.js";
import type { AnchorRects } from "./use-anchor-tracking.js";
import type { CommentsControl } from "./use-comments.js";

const toOpenComment = (control: CommentsControl): DesignComment | null => {
  if (!control.openId) {
    return null;
  }

  return control.comments.find((item) => item.id === control.openId) ?? null;
};

const toOpenRect = (open: DesignComment, rects: AnchorRects): Rect | null =>
  open.drawing?.box ?? rects.get(open.id) ?? null;

const OpenCommentSlot = ({
  rects,
  shared,
}: {
  rects: AnchorRects;
  shared: LayerShared;
}): ReactElement | null => {
  const { control, frame, initial, tools, zoom } = shared;
  const open = toOpenComment(control);
  const rect = open && toOpenRect(open, rects);

  if (!open || !rect) {
    return null;
  }

  return (
    <OpenComment
      comment={open}
      control={control}
      frame={frame}
      initial={initial}
      pageName={tools.pageName}
      rect={rect}
      zoom={zoom}
    />
  );
};

export { OpenCommentSlot };
