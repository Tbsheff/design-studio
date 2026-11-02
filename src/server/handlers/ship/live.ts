import { Layer } from "effect";

import { ShipRunner } from "../../ship/ship-runner.js";
import { ShipStore } from "../../ship/ship-store.js";

const ShipLive = Layer.mergeAll(ShipRunner.layer, ShipStore.layer);

export { ShipLive };
