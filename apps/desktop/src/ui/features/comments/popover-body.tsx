import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";
import { GrowingArea } from "./growing-area.js";

const PopoverBody = ({
  comment,
  isEditable,
  onChange,
  onEnter,
  text,
}: {
  comment: DesignComment;
  isEditable: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  text: string;
}): ReactElement => {
  if (!isEditable) {
    return <p className="comment-card-text">{comment.text}</p>;
  }

  return (
    <div className="comment-field">
      <GrowingArea
        label={`Edit comment ${comment.n}`}
        placeholder={copy.comment}
        value={text}
        onChange={onChange}
        onEnter={onEnter}
      />
    </div>
  );
};

export { PopoverBody };
