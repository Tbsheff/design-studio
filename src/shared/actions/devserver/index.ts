// @generated
import { createDevserver } from "./create.js";
import { getDevserver } from "./get.js";
import { listDevserver } from "./list.js";
import { runDevserver } from "./run.js";
import { setDevserver } from "./set.js";
import { startDevserver } from "./start.js";
import { stopDevserver } from "./stop.js";

const DevserverActions = {
  createDevserver,
  getDevserver,
  listDevserver,
  runDevserver,
  setDevserver,
  startDevserver,
  stopDevserver,
} as const;

export { DevserverActions };
