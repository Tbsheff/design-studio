// @generated
import type { VersionActions } from "@design-studio/actions/version/index";
import type { Entries } from "../_core/handler.js";
import { handle as applyHistoryVersionHandle } from "./apply-history.js";
import { handle as applyHunkVersionHandle } from "./apply-hunk.js";
import { handle as createSessionVersionHandle } from "./create-session.js";
import {
  handle as deleteSessionVersionHandle,
  preview as deleteSessionVersionPreview,
} from "./delete-session.js";
import { handle as getVersionHandle } from "./get.js";
import { handle as inspectDiffVersionHandle } from "./inspect-diff.js";
import { handle as listHistoryVersionHandle } from "./list-history.js";
import { handle as listHunksVersionHandle } from "./list-hunks.js";
import { handle as listVersionHandle } from "./list.js";
import { handle as renameVersionHandle } from "./rename.js";
import { handle as restoreHistoryVersionHandle } from "./restore-history.js";
import { handle as restoreVersionHandle } from "./restore.js";

const VersionEntries = {
  applyHistoryVersion: { handle: applyHistoryVersionHandle },
  applyHunkVersion: { handle: applyHunkVersionHandle },
  createSessionVersion: { handle: createSessionVersionHandle },
  deleteSessionVersion: {
    handle: deleteSessionVersionHandle,
    preview: deleteSessionVersionPreview,
  },
  getVersion: { handle: getVersionHandle },
  inspectDiffVersion: { handle: inspectDiffVersionHandle },
  listHistoryVersion: { handle: listHistoryVersionHandle },
  listHunksVersion: { handle: listHunksVersionHandle },
  listVersion: { handle: listVersionHandle },
  renameVersion: { handle: renameVersionHandle },
  restoreHistoryVersion: { handle: restoreHistoryVersionHandle },
  restoreVersion: { handle: restoreVersionHandle },
} satisfies Entries<typeof VersionActions>;

export { VersionEntries };
