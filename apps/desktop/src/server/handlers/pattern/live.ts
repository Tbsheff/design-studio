import { Layer } from "effect";

import {
  PatternStore,
  PatternUrlStore,
  PatternUrlWriter,
  PatternWriter,
} from "../../share/index.js";

const PatternLive = Layer.mergeAll(
  PatternStore.layer,
  PatternUrlStore.layer,
  PatternUrlWriter.layer,
  PatternWriter.layer
);

export { PatternLive };
