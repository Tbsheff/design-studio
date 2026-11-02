// @generated
import type { CommentsActions } from "../../../shared/actions/comments/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createReplyCommentsHandle } from "./create-reply.js";
import { handle as createCommentsHandle } from "./create.js";
import { handle as deleteReplyCommentsHandle } from "./delete-reply.js";
import { handle as deleteCommentsHandle } from "./delete.js";
import { handle as exportCommentsHandle } from "./export.js";
import { handle as insertCommentsHandle } from "./insert.js";
import { handle as listCommentsHandle } from "./list.js";
import { handle as moveCommentsHandle } from "./move.js";
import { handle as searchMentionCommentsHandle } from "./search-mention.js";
import { handle as setResolvedCommentsHandle } from "./set-resolved.js";
import { handle as startCommentsHandle } from "./start.js";
import { handle as updateCommentsHandle } from "./update.js";

const CommentsEntries = {
  createComments: { handle: createCommentsHandle },
  createReplyComments: { handle: createReplyCommentsHandle },
  deleteComments: { handle: deleteCommentsHandle },
  deleteReplyComments: { handle: deleteReplyCommentsHandle },
  exportComments: { handle: exportCommentsHandle },
  insertComments: { handle: insertCommentsHandle },
  listComments: { handle: listCommentsHandle },
  moveComments: { handle: moveCommentsHandle },
  searchMentionComments: { handle: searchMentionCommentsHandle },
  setResolvedComments: { handle: setResolvedCommentsHandle },
  startComments: { handle: startCommentsHandle },
  updateComments: { handle: updateCommentsHandle },
} satisfies Entries<typeof CommentsActions>;

export { CommentsEntries };
