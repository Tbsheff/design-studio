// @generated
import { getContextRun } from "./get-context.js";
import { getDraftRun } from "./get-draft.js";
import { getRun } from "./get.js";
import { listRun } from "./list.js";
import { renameRun } from "./rename.js";
import { setPermissionRun } from "./set-permission.js";
import { setQueueRun } from "./set-queue.js";
import { setSteerRun } from "./set-steer.js";
import { startRun } from "./start.js";
import { stopRun } from "./stop.js";

const RunActions = {
  getContextRun,
  getDraftRun,
  getRun,
  listRun,
  renameRun,
  setPermissionRun,
  setQueueRun,
  setSteerRun,
  startRun,
  stopRun,
} as const;

export { RunActions };
