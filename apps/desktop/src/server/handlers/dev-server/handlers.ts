// @generated
import type { DevServerActions } from "@design-studio/actions/dev-server/index";

import type { Entries } from "../_core/handler.js";
import { handle as createDevServerHandle } from "./create.js";
import { handle as getDevServerHandle } from "./get.js";
import { handle as listRoutesDevServerHandle } from "./list-routes.js";
import { handle as runDevServerHandle } from "./run.js";
import { handle as setDevServerHandle } from "./set.js";
import { handle as startDevServerHandle } from "./start.js";
import { handle as stopDevServerHandle } from "./stop.js";

const DevServerEntries = {
  createDevServer: { handle: createDevServerHandle },
  getDevServer: { handle: getDevServerHandle },
  listRoutesDevServer: { handle: listRoutesDevServerHandle },
  runDevServer: { handle: runDevServerHandle },
  setDevServer: { handle: setDevServerHandle },
  startDevServer: { handle: startDevServerHandle },
  stopDevServer: { handle: stopDevServerHandle },
} satisfies Entries<typeof DevServerActions>;

export { DevServerEntries };
