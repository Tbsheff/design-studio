import type { ReactElement } from "react";

import { toThreadCrumb } from "./comment-layer-model.js";
import type { FrameSize, Rect } from "./comment-layer-model.js";
import { OpenCommentPopover } from "./comment-popover.js";
import { DrawingStrokes } from "./deps.js";
import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";
import { useOpenComment } from "./use-open-comment.js";

const OpenComment = ({
  comment,
  control,
  frame,
  initial,
  pageName,
  rect,
  zoom,
}: {
  comment: DesignComment;
  control: CommentsControl;
  frame: FrameSize;
  initial: string | null;
  pageName: string;
  rect: Rect;
  zoom: number;
}): ReactElement => {
  const handlers = useOpenComment(comment, control);
  const { onClose, onDelete, onDeleteReply, onFix, onReopen } = handlers;
  const { onReply, onResolve, onSave, onSend } = handlers;

  return (
    <>
      {comment.drawing && <DrawingStrokes drawing={comment.drawing} />}
      <OpenCommentPopover
        key={comment.id}
        comment={comment}
        anchor={rect}
        zoom={zoom}
        frame={frame}
        breadcrumb={toThreadCrumb(comment, pageName)}
        initial={initial}
        busy={control.sending}
        onSend={onSend}
        onFix={onFix}
        onSave={onSave}
        onResolve={onResolve}
        onReopen={onReopen}
        onReply={onReply}
        onDeleteReply={onDeleteReply}
        onDelete={onDelete}
        onClose={onClose}
      />
    </>
  );
};

export { OpenComment };
