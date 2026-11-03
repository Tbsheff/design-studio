import { createReplyComment } from "./create-reply.js";
// @generated
import { createComment } from "./create.js";
import { deleteReplyComment } from "./delete-reply.js";
import { deleteComment } from "./delete.js";
import { exportComment } from "./export.js";
import { insertComment } from "./insert.js";
import { listComment } from "./list.js";
import { moveComment } from "./move.js";
import { searchMentionComment } from "./search-mention.js";
import { setResolvedComment } from "./set-resolved.js";
import { startComment } from "./start.js";
import { updateComment } from "./update.js";

const CommentActions = {
  createComment,
  createReplyComment,
  deleteComment,
  deleteReplyComment,
  exportComment,
  insertComment,
  listComment,
  moveComment,
  searchMentionComment,
  setResolvedComment,
  startComment,
  updateComment,
} as const;

export { CommentActions };
