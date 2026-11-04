import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { ShareRepo } from "../tenant/repos/share.js";
import { ViewerScope } from "../tenant/viewer-scope.js";

interface CommentInput {
  readonly anchor: string | null;
  readonly authorName: string | null;
  readonly body: string;
}

const addComment = Effect.fn("Share.addComment")(function* run(
  input: CommentInput
) {
  const scope = yield* ViewerScope;

  if (scope.kind !== "share" || !scope.canComment) {
    return yield* new NotFound({ message: "The share link does not exist." });
  }

  const repo = yield* ShareRepo;
  const id = yield* repo.addHeld(scope.shareId, input);

  return { id, isHeld: true };
});

export { addComment };

export type { CommentInput };
