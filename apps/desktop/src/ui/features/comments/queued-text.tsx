import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";
import { useCallback, useState } from "react";

import type { DesignComment } from "./deps.js";
import { fire } from "./fire.js";
import type { CommentsControl } from "./use-comments.js";

const MAX_LENGTH = 2000;

const focusNode = (node: HTMLInputElement | null): void => {
  node?.focus();
};

const QueuedText = ({
  comment,
  control,
  isEditing,
  onStop,
}: {
  comment: DesignComment;
  control: CommentsControl;
  isEditing: boolean;
  onStop: () => void;
}): ReactElement => {
  const [text, setText] = useState(comment.text);
  const { update } = control;

  const save = useCallback((): void => {
    const clean = text.trim();
    onStop();

    if (clean && clean !== comment.text) {
      fire(() => update(comment.id, { text: clean }));

      return;
    }

    setText(comment.text);
  }, [comment.id, comment.text, onStop, text, update]);

  const changeText = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setText(event.target.value);
    },
    []
  );

  const pressKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter") {
        save();
      }

      if (event.key === "Escape") {
        event.stopPropagation();
        setText(comment.text);
        onStop();
      }
    },
    [comment.text, onStop, save]
  );

  if (!isEditing) {
    return <span className="comment-row-text">{comment.text}</span>;
  }

  return (
    <input
      aria-label={`Edit comment ${comment.n}`}
      value={text}
      ref={focusNode}
      maxLength={MAX_LENGTH}
      onChange={changeText}
      onBlur={save}
      onKeyDown={pressKey}
    />
  );
};

export { QueuedText };
