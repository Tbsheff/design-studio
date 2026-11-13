// @generated
import { createDecisionRun } from "./create-decision.js";
import { getContextRun } from "./get-context.js";
import { getRun } from "./get.js";
import { listDecisionsRun } from "./list-decisions.js";
import { listRun } from "./list.js";
import { renameRun } from "./rename.js";
import { setDecisionRun } from "./set-decision.js";
import { setPermissionRun } from "./set-permission.js";
import { setQueueRun } from "./set-queue.js";
import { setSteerRun } from "./set-steer.js";
import { startRun } from "./start.js";
import { stopRun } from "./stop.js";

const RunActions = {
  createDecisionRun,
  getContextRun,
  getRun,
  listDecisionsRun,
  listRun,
  renameRun,
  setDecisionRun,
  setPermissionRun,
  setQueueRun,
  setSteerRun,
  startRun,
  stopRun,
} as const;

export { RunActions };
