import { useCallback } from "react";
import type { ReactElement } from "react";

import type { PublicationComment } from "../../../shared/publish.js";
import { copy } from "./copy.js";

interface Props {
  comment: PublicationComment;
  onRemove: (commentId: string) => void;
}

const PublicationCommentItem = ({ comment, onRemove }: Props): ReactElement => {
  const remove = useCallback((): void => {
    onRemove(comment.id);
  }, [comment.id, onRemove]);

  return (
    <li className="publish-comment">
      <div className="publish-comment-text">
        <span className="publish-comment-who">{comment.author}</span>
        <span className="publish-comment-body">{comment.body}</span>
      </div>
      <button
        type="button"
        className="btn ghost small danger"
        onClick={remove}
        data-tip={copy.deleteCommentTip}
      >
        {copy.delete}
      </button>
    </li>
  );
};

export { PublicationCommentItem };
