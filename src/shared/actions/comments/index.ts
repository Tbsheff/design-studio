import { createReplyComments } from "./create-reply.js";
// @generated
import { createComments } from "./create.js";
import { deleteReplyComments } from "./delete-reply.js";
import { deleteComments } from "./delete.js";
import { exportComments } from "./export.js";
import { insertComments } from "./insert.js";
import { listComments } from "./list.js";
import { moveComments } from "./move.js";
import { searchMentionComments } from "./search-mention.js";
import { setResolvedComments } from "./set-resolved.js";
import { startComments } from "./start.js";
import { updateComments } from "./update.js";

const CommentsActions = {
  createComments,
  createReplyComments,
  deleteComments,
  deleteReplyComments,
  exportComments,
  insertComments,
  listComments,
  moveComments,
  searchMentionComments,
  setResolvedComments,
  startComments,
  updateComments,
} as const;

export { CommentsActions };
