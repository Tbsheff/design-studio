// @generated
import { applyHistoryVersion } from "./apply-history.js";
import { applyHunkVersion } from "./apply-hunk.js";
import { createSessionVersion } from "./create-session.js";
import { createVersion } from "./create.js";
import { deleteSessionVersion } from "./delete-session.js";
import { exportVersion } from "./export.js";
import { getVersion } from "./get.js";
import { inspectChangesVersion } from "./inspect-changes.js";
import { inspectDiffVersion } from "./inspect-diff.js";
import { inspectPreviewVersion } from "./inspect-preview.js";
import { listHistoryVersion } from "./list-history.js";
import { listHunksVersion } from "./list-hunks.js";
import { listVersion } from "./list.js";
import { renameVersion } from "./rename.js";
import { restoreHeadVersion } from "./restore-head.js";
import { restoreHistoryVersion } from "./restore-history.js";
import { restoreWorkTreeVersion } from "./restore-work-tree.js";
import { restoreVersion } from "./restore.js";

const VersionActions = {
  applyHistoryVersion,
  applyHunkVersion,
  createSessionVersion,
  createVersion,
  deleteSessionVersion,
  exportVersion,
  getVersion,
  inspectChangesVersion,
  inspectDiffVersion,
  inspectPreviewVersion,
  listHistoryVersion,
  listHunksVersion,
  listVersion,
  renameVersion,
  restoreHeadVersion,
  restoreHistoryVersion,
  restoreVersion,
  restoreWorkTreeVersion,
} as const;

export { VersionActions };
