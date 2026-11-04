// @generated
import { createDevServer } from "./create.js";
import { getDevServer } from "./get.js";
import { listRoutesDevServer } from "./list-routes.js";
import { runDevServer } from "./run.js";
import { setDevServer } from "./set.js";
import { startDevServer } from "./start.js";
import { stopDevServer } from "./stop.js";

const DevServerActions = {
  createDevServer,
  getDevServer,
  listRoutesDevServer,
  runDevServer,
  setDevServer,
  startDevServer,
  stopDevServer,
} as const;

export { DevServerActions };
