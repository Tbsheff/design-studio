import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";

const PinTip = ({ comment }: { comment: DesignComment }): ReactElement => (
  <span className="comment-pin-tip" role="tooltip">
    <span className="comment-pin-num">
      {copy.textGlyph2}
      {comment.n}
    </span>{" "}
    {comment.author && (
      <span className="comment-pin-author">
        {comment.author}
        {copy.textGlyph4}
      </span>
    )}{" "}
    {comment.text}
  </span>
);

export { PinTip };
