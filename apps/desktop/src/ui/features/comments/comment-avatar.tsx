import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";

interface AvatarProps {
  initial: string | null;
  flip?: boolean;
  tone?: string;
  count?: number;
  author?: string | undefined;
}

const authorInitial = (author: string): string =>
  (author.trim()[0] ?? "?").toUpperCase();

const AvatarFace = ({
  initial,
  flip = false,
  tone = "queued",
  count = 0,
  author,
}: AvatarProps): ReactElement => {
  const face = author ? authorInitial(author) : initial;

  return (
    <span
      className={`avatar-pin ${tone}${flip ? " flip" : ""}${author ? " agent" : ""}`}
      aria-hidden="true"
    >
      <span className="avatar-face">
        {face ?? <Icon name="comment" size={12} />}
      </span>
      {count > 0 && (
        <span className="avatar-count">{count > 9 ? "9+" : count}</span>
      )}
    </span>
  );
};

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
          Viewer
        </span>
      )}
    </span>
  );
};

export { authorInitial, AvatarFace, CommentAuthor };
