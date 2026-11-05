import { Layer } from "effect";

import { StateStyleStore, StateStyleWriter } from "../../state-styles/index.js";

const StateStyleLive = Layer.mergeAll(
  StateStyleStore.layer,
  StateStyleWriter.layer
);

export { StateStyleLive };
