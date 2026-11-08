import type { DesignComment } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useTransition } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toNoun } from "./run-comments-model.js";

type UpdateComment = (
  id: string,
  patch: { status: "resolved" }
) => Promise<void>;

const resolveAll = async (
  update: UpdateComment,
  comments: readonly DesignComment[]
): Promise<void> => {
  const [first, ...rest] = comments;

  if (!first) {
    return;
  }

  await update(first.id, { status: "resolved" });
  await resolveAll(update, rest);
};

const ResolveButton = ({
  update,
  comments,
}: {
  update: UpdateComment;
  comments: readonly DesignComment[];
}): ReactElement => {
  const [isPending, startTransition] = useTransition();

  const onResolve = useCallback(() => {
    startTransition(async () => {
      await resolveAll(update, comments);
    });
  }, [update, comments]);

  return (
    <button
      type="button"
      className="btn small primary"
      data-testid="resolve-run-comments"
      disabled={isPending}
      onClick={onResolve}
    >
      <Icon name="check" size={14} />
      {copy.resolve}
      {comments.length} {toNoun(comments.length)}
    </button>
  );
};

export { ResolveButton };
