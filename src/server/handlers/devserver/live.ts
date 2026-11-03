import { Layer } from "effect";

import { DevServerRunner } from "../../app/dev-server-runner.js";
import { DevServerStore } from "../../app/dev-server-store.js";

const DevserverLive = Layer.mergeAll(
  DevServerStore.layer,
  DevServerRunner.layer
);

export { DevserverLive };
