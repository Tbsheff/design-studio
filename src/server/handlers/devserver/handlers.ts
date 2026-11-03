// @generated
import type { DevserverActions } from "../../../shared/actions/devserver/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createDevserverHandle } from "./create.js";
import { handle as getDevserverHandle } from "./get.js";
import { handle as listDevserverHandle } from "./list.js";
import { handle as runDevserverHandle } from "./run.js";
import { handle as setDevserverHandle } from "./set.js";
import { handle as startDevserverHandle } from "./start.js";
import { handle as stopDevserverHandle } from "./stop.js";

const DevserverEntries = {
  createDevserver: { handle: createDevserverHandle },
  getDevserver: { handle: getDevserverHandle },
  listDevserver: { handle: listDevserverHandle },
  runDevserver: { handle: runDevserverHandle },
  setDevserver: { handle: setDevserverHandle },
  startDevserver: { handle: startDevserverHandle },
  stopDevserver: { handle: stopDevserverHandle },
} satisfies Entries<typeof DevserverActions>;

export { DevserverEntries };
