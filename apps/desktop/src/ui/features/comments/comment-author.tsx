import type { ReactElement } from "react";

import { authorInitial } from "./comment-avatar.js";
import { copy } from "./copy.js";

const CommentAuthor = ({
  author,
  viewer = false,
}: {
  author: string | undefined;
  viewer?: boolean;
}): ReactElement | null => {
  if (!author) {
    return null;
  }

  return (
    <span className="comment-author" data-testid="comment-author">
      <span className="comment-author-face" aria-hidden="true">
        {authorInitial(author)}
      </span>
      {author}
      {viewer && (
        <span className="comment-viewer-tag" data-tip={copy.viewerTag}>
          {copy.textViewer}
        </span>
      )}
    </span>
  );
};

export { CommentAuthor };
