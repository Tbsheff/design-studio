// @generated
import { applyHistoryVersion } from "./apply-history.js";
import { applyHunkVersion } from "./apply-hunk.js";
import { createSessionVersion } from "./create-session.js";
import { deleteSessionVersion } from "./delete-session.js";
import { getVersion } from "./get.js";
import { inspectDiffVersion } from "./inspect-diff.js";
import { listHistoryVersion } from "./list-history.js";
import { listHunksVersion } from "./list-hunks.js";
import { listVersion } from "./list.js";
import { renameVersion } from "./rename.js";
import { restoreHistoryVersion } from "./restore-history.js";
import { restoreVersion } from "./restore.js";

const VersionActions = {
  applyHistoryVersion,
  applyHunkVersion,
  createSessionVersion,
  deleteSessionVersion,
  getVersion,
  inspectDiffVersion,
  listHistoryVersion,
  listHunksVersion,
  listVersion,
  renameVersion,
  restoreHistoryVersion,
  restoreVersion,
} as const;

export { VersionActions };
