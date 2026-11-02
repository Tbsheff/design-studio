// @generated
import { deleteCommentPublish } from "./delete-comment.js";
import { getPublish } from "./get.js";
import { inspectPublish } from "./inspect.js";
import { listCommentsPublish } from "./list-comments.js";
import { listPublish } from "./list.js";
import { publishPublish } from "./publish.js";
import { restorePublish } from "./restore.js";
import { unpublishPublish } from "./unpublish.js";

const PublishActions = {
  deleteCommentPublish,
  getPublish,
  inspectPublish,
  listCommentsPublish,
  listPublish,
  publishPublish,
  restorePublish,
  unpublishPublish,
} as const;

export { PublishActions };
