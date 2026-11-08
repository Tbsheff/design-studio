import type { ReactElement } from "react";

import { CommentAuthor } from "./comment-author.js";
import { STATUS_LABEL } from "./comment-status.js";
import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";
import { ThreadFixButton } from "./thread-fix-button.js";
import { ThreadIconButton } from "./thread-icon-button.js";
import { ThreadStateButton } from "./thread-state-button.js";

interface HeadProps {
  comment: DesignComment;
  onClose: () => void;
  onDelete: () => void;
  onFix: (() => void) | null;
  onReopen: () => void;
  onResolve: () => void;
}

const PopoverHead = ({
  comment,
  onClose,
  onDelete,
  onFix,
  onReopen,
  onResolve,
}: HeadProps): ReactElement => (
  <div className="thread-head">
    <span className="thread-num">
      {copy.textGlyph2}
      {comment.n}
    </span>
    <CommentAuthor author={comment.author} viewer={comment.from === "viewer"} />
    <span className={`thread-status ${comment.status}`}>
      {STATUS_LABEL[comment.status]}
    </span>
    <span className="spacer" />
    <ThreadFixButton onFix={onFix} />
    <ThreadStateButton
      comment={comment}
      onReopen={onReopen}
      onResolve={onResolve}
    />
    <ThreadIconButton
      icon="trash"
      isDanger
      label={copy.delete}
      onClick={onDelete}
      size={14}
      tip={copy.delete}
    />
    <ThreadIconButton
      icon="close"
      isDanger={false}
      label={copy.close}
      onClick={onClose}
      size={14}
    />
  </div>
);

export { PopoverHead };
