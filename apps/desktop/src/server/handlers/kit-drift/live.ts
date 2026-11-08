import { Layer } from "effect";

import { KitDriftStore, KitDriftWriter } from "../../components/index.js";

const KitDriftLive = Layer.mergeAll(KitDriftStore.layer, KitDriftWriter.layer);

export { KitDriftLive };
