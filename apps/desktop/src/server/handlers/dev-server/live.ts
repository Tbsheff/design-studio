import { Layer } from "effect";

import { DevServerRunner, DevServerStore } from "../../app/index.js";

const DevServerLive = Layer.mergeAll(
  DevServerStore.layer,
  DevServerRunner.layer
);

export { DevServerLive };
