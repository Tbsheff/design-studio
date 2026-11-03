import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { searchMentionComments } from "../../../shared/actions/comments/search-mention.js";
import { CommentStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type SearchMentionCommentsInput = Input<typeof searchMentionComments>;

const handle = Effect.fn("comments.searchMention")(function* run(
  input: SearchMentionCommentsInput
) {
  const store = yield* CommentStore;

  return yield* store.searchMention({
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
  });
}) satisfies Handle<typeof searchMentionComments>;

export { handle };
