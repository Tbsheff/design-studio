// @generated
import type { CommentActions } from "../../../shared/actions/comment/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createReplyCommentHandle } from "./create-reply.js";
import { handle as createCommentHandle } from "./create.js";
import { handle as deleteReplyCommentHandle } from "./delete-reply.js";
import { handle as deleteCommentHandle } from "./delete.js";
import { handle as exportCommentHandle } from "./export.js";
import { handle as insertCommentHandle } from "./insert.js";
import { handle as listCommentHandle } from "./list.js";
import { handle as moveCommentHandle } from "./move.js";
import { handle as searchMentionCommentHandle } from "./search-mention.js";
import { handle as setResolvedCommentHandle } from "./set-resolved.js";
import { handle as startCommentHandle } from "./start.js";
import { handle as updateCommentHandle } from "./update.js";

const CommentEntries = {
  createComment: { handle: createCommentHandle },
  createReplyComment: { handle: createReplyCommentHandle },
  deleteComment: { handle: deleteCommentHandle },
  deleteReplyComment: { handle: deleteReplyCommentHandle },
  exportComment: { handle: exportCommentHandle },
  insertComment: { handle: insertCommentHandle },
  listComment: { handle: listCommentHandle },
  moveComment: { handle: moveCommentHandle },
  searchMentionComment: { handle: searchMentionCommentHandle },
  setResolvedComment: { handle: setResolvedCommentHandle },
  startComment: { handle: startCommentHandle },
  updateComment: { handle: updateCommentHandle },
} satisfies Entries<typeof CommentActions>;

export { CommentEntries };
