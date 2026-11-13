// @generated
import type { RunActions } from "@design-studio/actions/run/index";

import type { Entries } from "../_core/handler.js";
import { handle as createDecisionRunHandle } from "./create-decision.js";
import { handle as getContextRunHandle } from "./get-context.js";
import { handle as getRunHandle } from "./get.js";
import { handle as listDecisionsRunHandle } from "./list-decisions.js";
import { handle as listRunHandle } from "./list.js";
import { handle as renameRunHandle } from "./rename.js";
import { handle as setDecisionRunHandle } from "./set-decision.js";
import { handle as setPermissionRunHandle } from "./set-permission.js";
import { handle as setQueueRunHandle } from "./set-queue.js";
import { handle as setSteerRunHandle } from "./set-steer.js";
import { handle as startRunHandle } from "./start.js";
import { handle as stopRunHandle } from "./stop.js";

const RunEntries = {
  createDecisionRun: { handle: createDecisionRunHandle },
  getContextRun: { handle: getContextRunHandle },
  getRun: { handle: getRunHandle },
  listDecisionsRun: { handle: listDecisionsRunHandle },
  listRun: { handle: listRunHandle },
  renameRun: { handle: renameRunHandle },
  setDecisionRun: { handle: setDecisionRunHandle },
  setPermissionRun: { handle: setPermissionRunHandle },
  setQueueRun: { handle: setQueueRunHandle },
  setSteerRun: { handle: setSteerRunHandle },
  startRun: { handle: startRunHandle },
  stopRun: { handle: stopRunHandle },
} satisfies Entries<typeof RunActions>;

export { RunEntries };
