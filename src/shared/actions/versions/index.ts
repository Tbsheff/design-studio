// @generated
import { applyHistoryVersions } from "./apply-history.js";
import { applyHunkVersions } from "./apply-hunk.js";
import { createSessionVersions } from "./create-session.js";
import { deleteSessionVersions } from "./delete-session.js";
import { getVersions } from "./get.js";
import { inspectDiffVersions } from "./inspect-diff.js";
import { listHistoryVersions } from "./list-history.js";
import { listHunksVersions } from "./list-hunks.js";
import { listVersions } from "./list.js";
import { renameVersions } from "./rename.js";
import { restoreHistoryVersions } from "./restore-history.js";
import { restoreVersions } from "./restore.js";

const VersionsActions = {
  applyHistoryVersions,
  applyHunkVersions,
  createSessionVersions,
  deleteSessionVersions,
  getVersions,
  inspectDiffVersions,
  listVersions,
  listHistoryVersions,
  listHunksVersions,
  renameVersions,
  restoreVersions,
  restoreHistoryVersions,
} as const;

export { VersionsActions };
