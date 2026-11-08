// @generated
import type { VersionActions } from "@design-studio/actions/version/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyHistoryVersionHandle } from "./apply-history.js";
import { handle as applyHunkVersionHandle } from "./apply-hunk.js";
import { handle as createSessionVersionHandle } from "./create-session.js";
import { handle as createVersionHandle } from "./create.js";
import {
  handle as deleteSessionVersionHandle,
  preview as deleteSessionVersionPreview,
} from "./delete-session.js";
import { handle as exportVersionHandle } from "./export.js";
import { handle as getVersionHandle } from "./get.js";
import { handle as inspectDiffVersionHandle } from "./inspect-diff.js";
import { handle as inspectPreviewVersionHandle } from "./inspect-preview.js";
import { handle as listHistoryVersionHandle } from "./list-history.js";
import { handle as listHunksVersionHandle } from "./list-hunks.js";
import { handle as listVersionHandle } from "./list.js";
import { handle as renameVersionHandle } from "./rename.js";
import { handle as restoreHeadVersionHandle } from "./restore-head.js";
import { handle as restoreHistoryVersionHandle } from "./restore-history.js";
import { handle as restoreWorkTreeVersionHandle } from "./restore-work-tree.js";
import { handle as restoreVersionHandle } from "./restore.js";

const VersionEntries = {
  applyHistoryVersion: { handle: applyHistoryVersionHandle },
  applyHunkVersion: { handle: applyHunkVersionHandle },
  createSessionVersion: { handle: createSessionVersionHandle },
  createVersion: { handle: createVersionHandle },
  deleteSessionVersion: {
    handle: deleteSessionVersionHandle,
    preview: deleteSessionVersionPreview,
  },
  exportVersion: { handle: exportVersionHandle },
  getVersion: { handle: getVersionHandle },
  inspectDiffVersion: { handle: inspectDiffVersionHandle },
  inspectPreviewVersion: { handle: inspectPreviewVersionHandle },
  listHistoryVersion: { handle: listHistoryVersionHandle },
  listHunksVersion: { handle: listHunksVersionHandle },
  listVersion: { handle: listVersionHandle },
  renameVersion: { handle: renameVersionHandle },
  restoreHeadVersion: { handle: restoreHeadVersionHandle },
  restoreHistoryVersion: { handle: restoreHistoryVersionHandle },
  restoreVersion: { handle: restoreVersionHandle },
  restoreWorkTreeVersion: { handle: restoreWorkTreeVersionHandle },
} satisfies Entries<typeof VersionActions>;

export { VersionEntries };
