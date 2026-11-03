import { Layer } from "effect";

import { ShipRunner, ShipStore } from "../../ship/index.js";

const ShipLive = Layer.mergeAll(ShipRunner.layer, ShipStore.layer);

export { ShipLive };
