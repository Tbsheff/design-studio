// @generated
import type { PublishActions } from "../../../shared/actions/publish/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getPublishHandle } from "./get.js";
import { handle as inspectPublishHandle } from "./inspect.js";
import { handle as listCommentsPublishHandle } from "./list-comments.js";
import { handle as listPublishHandle } from "./list.js";

const PublishEntries = {
  getPublish: { handle: getPublishHandle },
  inspectPublish: { handle: inspectPublishHandle },
  listCommentsPublish: { handle: listCommentsPublishHandle },
  listPublish: { handle: listPublishHandle },
} satisfies Entries<typeof PublishActions>;

export { PublishEntries };
