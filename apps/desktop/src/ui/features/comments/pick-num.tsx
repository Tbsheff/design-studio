import type { ReactElement } from "react";
import { useCallback } from "react";

import { canPickForChat } from "./deps.js";
import type { DesignComment } from "./deps.js";
import { PickFace } from "./pick-face.js";
import type { CommentsControl } from "./use-comments.js";

const toPickClass = (comment: DesignComment, isOn: boolean): string => {
  if (isOn) {
    return `comment-num ${comment.status} pick picked`;
  }

  return `comment-num ${comment.status} pick`;
};

const toPickTip = (isOn: boolean): string => {
  if (isOn) {
    return "Selected for the chat";
  }

  return "Select for the chat";
};

const PickNum = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement => {
  const { togglePick } = control;
  const isOn = control.picked.includes(comment.id);

  const toggle = useCallback((): void => {
    togglePick(comment.id);
  }, [comment.id, togglePick]);

  if (!canPickForChat(comment.status)) {
    return <span className={`comment-num ${comment.status}`}>{comment.n}</span>;
  }

  return (
    <button
      type="button"
      aria-pressed={isOn}
      aria-label={`Select comment ${comment.n} for the chat`}
      data-tip={toPickTip(isOn)}
      className={toPickClass(comment, isOn)}
      data-testid="comment-pick"
      onClick={toggle}
    >
      <PickFace comment={comment} isOn={isOn} />
    </button>
  );
};

export { PickNum };
