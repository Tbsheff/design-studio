import type { DesignComment } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { CommentNumber } from "./comment-number.js";
import { STATE_TIP } from "./run-comments-model.js";
import type { LinkState } from "./run-comments-model.js";

const CommentLink = ({
  comment,
  state,
  onOpenComment,
}: {
  comment: DesignComment;
  state: LinkState;
  onOpenComment: (id: string) => void;
}): ReactElement => {
  const onOpen = useCallback(
    () => onOpenComment(comment.id),
    [onOpenComment, comment.id]
  );

  return (
    <li>
      <button
        type="button"
        className="run-comment-link"
        data-state={state}
        data-testid="run-comment-link"
        data-tip={`${STATE_TIP[state]}. Show it on the canvas.`}
        onClick={onOpen}
      >
        <CommentNumber number={comment.n} state={state} />
        <span className="text">{comment.text}</span>
      </button>
    </li>
  );
};

export { CommentLink };
