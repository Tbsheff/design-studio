import type { ShareViewerComment } from "@design-studio/contracts/share-play";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShareCommentForm } from "./share-comment-form.js";
import type { PinSpot, ViewerFrame } from "./share-viewer-model.js";
import type { ShareComments as CommentState } from "./use-share-comments.js";

interface ShareCommentsProps {
  readonly comments: CommentState;
  readonly draft: PinSpot | null;
  readonly frames: readonly ViewerFrame[];
  readonly selected: number;
  readonly onClearDraft: () => void;
}

const toFrameName = (frames: readonly ViewerFrame[], index: number): string =>
  frames[index]?.label ?? "";

const toCommentNode = (
  comment: ShareViewerComment,
  frames: readonly ViewerFrame[]
): ReactElement => (
  <li key={comment.n} className="share-comment">
    <span className="share-comment-who">{`${comment.n}. ${comment.author}`}</span>
    <span className="share-comment-frame">
      {toFrameName(frames, comment.frame)}
    </span>
    <p className="share-comment-text">{comment.text}</p>
  </li>
);

const toListNode = (
  list: readonly ShareViewerComment[],
  frames: readonly ViewerFrame[]
): ReactElement => {
  if (list.length === 0) {
    return <p className="share-hint">{copy.noComments}</p>;
  }

  return (
    <ol className="share-comment-list">
      {list.map((comment) => toCommentNode(comment, frames))}
    </ol>
  );
};

const ShareComments = ({
  comments,
  draft,
  frames,
  onClearDraft,
  selected,
}: ShareCommentsProps): ReactElement => (
  <aside className="share-side" aria-label={copy.comments}>
    <h2 className="share-side-title">{copy.comments}</h2>
    <p className="share-hint">{copy.commentHint}</p>
    <ShareCommentForm
      comments={comments}
      draft={draft}
      frameName={toFrameName(frames, draft?.frame ?? selected)}
      selected={selected}
      onClearDraft={onClearDraft}
    />
    {toListNode(comments.comments, frames)}
  </aside>
);

export { ShareComments };
