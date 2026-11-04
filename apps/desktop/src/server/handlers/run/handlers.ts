// @generated
import type { RunActions } from "../../../shared/actions/run/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getContextRunHandle } from "./get-context.js";
import { handle as getRunHandle } from "./get.js";
import { handle as listRunHandle } from "./list.js";
import { handle as renameRunHandle } from "./rename.js";
import { handle as setPermissionRunHandle } from "./set-permission.js";
import { handle as setQueueRunHandle } from "./set-queue.js";
import { handle as setSteerRunHandle } from "./set-steer.js";
import { handle as startRunHandle } from "./start.js";
import { handle as stopRunHandle } from "./stop.js";

const RunEntries = {
  getContextRun: { handle: getContextRunHandle },
  getRun: { handle: getRunHandle },
  listRun: { handle: listRunHandle },
  renameRun: { handle: renameRunHandle },
  setPermissionRun: { handle: setPermissionRunHandle },
  setQueueRun: { handle: setQueueRunHandle },
  setSteerRun: { handle: setSteerRunHandle },
  startRun: { handle: startRunHandle },
  stopRun: { handle: stopRunHandle },
} satisfies Entries<typeof RunActions>;

export { RunEntries };
