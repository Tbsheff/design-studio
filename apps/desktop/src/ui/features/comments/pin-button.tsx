import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { useCallback } from "react";

import { AvatarFace } from "./comment-avatar.js";
import { toPinClass, toPinLabel } from "./comment-pin-model.js";
import { PenIcon, canPickForChat } from "./deps.js";
import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const PEN_SIZE = 10;

const stopPointer = (event: PointerEvent<HTMLButtonElement>): void => {
  event.stopPropagation();
};

const PinButton = ({
  comment,
  control,
  initial,
  isFlipped,
}: {
  comment: DesignComment;
  control: CommentsControl;
  initial: string | null;
  isFlipped: boolean;
}): ReactElement => {
  const { picked, setOpenId, togglePick } = control;
  const replies = comment.replies?.length ?? 0;
  const { id, status } = comment;

  const click = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const isMulti = event.shiftKey || event.metaKey || event.ctrlKey;

      if (isMulti && canPickForChat(status)) {
        togglePick(id);
      } else {
        setOpenId(id);
      }
    },
    [id, setOpenId, status, togglePick]
  );

  return (
    <button
      type="button"
      className={toPinClass(comment, picked.includes(id))}
      data-testid="comment-pin"
      data-comment-id={id}
      aria-label={toPinLabel(comment, replies)}
      aria-expanded={false}
      onPointerDown={stopPointer}
      onClick={click}
    >
      <AvatarFace
        initial={initial}
        flip={isFlipped}
        tone={status}
        count={replies}
        author={comment.author}
      />
      {comment.drawing && (
        <span className="pin-pen" aria-hidden="true">
          <PenIcon size={PEN_SIZE} />
        </span>
      )}
    </button>
  );
};

export { PinButton };
