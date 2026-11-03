// @generated
import type { VersionsActions } from "../../../shared/actions/versions/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as applyHistoryVersionsHandle } from "./apply-history.js";
import { handle as applyHunkVersionsHandle } from "./apply-hunk.js";
import { handle as createSessionVersionsHandle } from "./create-session.js";
import {
  handle as deleteSessionVersionsHandle,
  preview as deleteSessionVersionsPreview,
} from "./delete-session.js";
import { handle as getVersionsHandle } from "./get.js";
import { handle as inspectDiffVersionsHandle } from "./inspect-diff.js";
import { handle as listHistoryVersionsHandle } from "./list-history.js";
import { handle as listHunksVersionsHandle } from "./list-hunks.js";
import { handle as listVersionsHandle } from "./list.js";
import { handle as renameVersionsHandle } from "./rename.js";
import { handle as restoreHistoryVersionsHandle } from "./restore-history.js";
import { handle as restoreVersionsHandle } from "./restore.js";

const VersionsEntries = {
  applyHistoryVersions: { handle: applyHistoryVersionsHandle },
  applyHunkVersions: { handle: applyHunkVersionsHandle },
  createSessionVersions: { handle: createSessionVersionsHandle },
  deleteSessionVersions: {
    handle: deleteSessionVersionsHandle,
    preview: deleteSessionVersionsPreview,
  },
  getVersions: { handle: getVersionsHandle },
  inspectDiffVersions: { handle: inspectDiffVersionsHandle },
  listHistoryVersions: { handle: listHistoryVersionsHandle },
  listHunksVersions: { handle: listHunksVersionsHandle },
  listVersions: { handle: listVersionsHandle },
  renameVersions: { handle: renameVersionsHandle },
  restoreHistoryVersions: { handle: restoreHistoryVersionsHandle },
  restoreVersions: { handle: restoreVersionsHandle },
} satisfies Entries<typeof VersionsActions>;

export { VersionsEntries };
