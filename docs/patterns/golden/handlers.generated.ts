// @generated
import type { PublishOps } from "../../../shared/contract/publish/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as listHandle } from "./list.js";
import {
  handle as unpublishHandle,
  preview as unpublishPreview,
} from "./unpublish.js";

const PublishEntries = {
  list: { handle: listHandle },
  unpublish: { handle: unpublishHandle, preview: unpublishPreview },
} satisfies Entries<typeof PublishOps>;

export { PublishEntries };
