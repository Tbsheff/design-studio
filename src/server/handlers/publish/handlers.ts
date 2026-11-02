// @generated
import type { PublishActions } from "../../../shared/actions/publish/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as deleteCommentPublishHandle } from "./delete-comment.js";
import { handle as getPublishHandle } from "./get.js";
import { handle as inspectPublishHandle } from "./inspect.js";
import { handle as listCommentsPublishHandle } from "./list-comments.js";
import { handle as listPublishHandle } from "./list.js";
import {
  handle as publishPublishHandle,
  preview as publishPublishPreview,
} from "./publish.js";
import {
  handle as restorePublishHandle,
  preview as restorePublishPreview,
} from "./restore.js";
import {
  handle as unpublishPublishHandle,
  preview as unpublishPublishPreview,
} from "./unpublish.js";

const PublishEntries = {
  deleteCommentPublish: { handle: deleteCommentPublishHandle },
  getPublish: { handle: getPublishHandle },
  inspectPublish: { handle: inspectPublishHandle },
  listCommentsPublish: { handle: listCommentsPublishHandle },
  listPublish: { handle: listPublishHandle },
  publishPublish: {
    handle: publishPublishHandle,
    preview: publishPublishPreview,
  },
  restorePublish: {
    handle: restorePublishHandle,
    preview: restorePublishPreview,
  },
  unpublishPublish: {
    handle: unpublishPublishHandle,
    preview: unpublishPublishPreview,
  },
} satisfies Entries<typeof PublishActions>;

export { PublishEntries };
