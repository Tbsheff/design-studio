import { Layer } from "effect";

import { FixtureStore, FixtureWriter } from "../../export/index.js";

const FixtureLive = Layer.mergeAll(FixtureStore.layer, FixtureWriter.layer);

export { FixtureLive };
