import { Icon } from "@design-studio/ui";
import { createContext, useContext, useMemo } from "react";
import type { ReactElement } from "react";

import { commentsDone } from "../../../shared/comments.js";
import type { CommentsControl } from "../comments/index.js";
import { copy } from "./copy.js";
import { ResolveButton } from "./resolve-button.js";
import { CommentLink } from "./run-comment-link.js";
import {
  idsOf,
  replyText,
  resolvable,
  stateOf,
  toNoun,
} from "./run-comments-model.js";
import type { RunView } from "./run-state-model.js";

const RunCommentsContext = createContext<CommentsControl | null>(null);

const RunCommentsCard = ({ run }: { run: RunView }): ReactElement | null => {
  const control = useContext(RunCommentsContext);
  const comments = control?.comments;
  const { request } = run;
  const summaryRequest = run.summary?.request;

  const linked = useMemo(() => {
    const ids = new Set([...idsOf(summaryRequest), ...idsOf(request)]);

    return (comments ?? []).filter((comment) => ids.has(comment.id));
  }, [comments, summaryRequest, request]);

  const done = commentsDone(replyText(run));

  const toResolve = useMemo(() => {
    if (run.status === "completed") {
      return resolvable(linked, done);
    }

    return [];
  }, [run.status, linked, done]);

  if (!control || run.status === "running" || linked.length === 0) {
    return null;
  }

  const { setOpenId: onOpenComment, update: onUpdateComment } = control;

  return (
    <section
      className="run-comments"
      aria-label={copy.commentsInThis}
      data-testid="run-comments"
    >
      <div className="run-comments-head">
        <Icon name="comment" size={14} />
        <span>
          {linked.length} {toNoun(linked.length)}
        </span>
        <span className="spacer" />
        {toResolve.length > 0 && (
          <ResolveButton update={onUpdateComment} comments={toResolve} />
        )}
      </div>
      <ul className="run-comments-list">
        {linked.map((comment) => (
          <CommentLink
            key={comment.id}
            comment={comment}
            state={stateOf(comment, done)}
            onOpenComment={onOpenComment}
          />
        ))}
      </ul>
    </section>
  );
};

export { RunCommentsCard, RunCommentsContext };
