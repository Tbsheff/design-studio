// @generated
import type { CommentsActions } from "../../../shared/actions/comments/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as listCommentsHandle } from "./list.js";
import { handle as searchMentionCommentsHandle } from "./search-mention.js";

const CommentsEntries = {
  listComments: { handle: listCommentsHandle },
  searchMentionComments: { handle: searchMentionCommentsHandle },
} satisfies Entries<typeof CommentsActions>;

export { CommentsEntries };
