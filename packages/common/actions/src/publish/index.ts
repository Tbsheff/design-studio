// @generated
import { applyPublish } from "./apply.js";
import { deleteCommentPublish } from "./delete-comment.js";
import { deletePublish } from "./delete.js";
import { getPublish } from "./get.js";
import { inspectPublish } from "./inspect.js";
import { listCommentsPublish } from "./list-comments.js";
import { listPublish } from "./list.js";
import { publishPublish } from "./publish.js";
import { restorePublish } from "./restore.js";
import { setPublish } from "./set.js";
import { startPublish } from "./start.js";
import { stopPublish } from "./stop.js";
import { unpublishPublish } from "./unpublish.js";

const PublishActions = {
  applyPublish,
  deleteCommentPublish,
  deletePublish,
  getPublish,
  inspectPublish,
  listCommentsPublish,
  listPublish,
  publishPublish,
  restorePublish,
  setPublish,
  startPublish,
  stopPublish,
  unpublishPublish,
} as const;

export { PublishActions };
