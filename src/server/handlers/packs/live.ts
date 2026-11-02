import { Layer } from "effect";

import { PackStore } from "../../design-system/ops/pack-store.js";
import { PackWriter } from "../../design-system/ops/pack-writer.js";

const PacksLive = Layer.mergeAll(PackStore.layer, PackWriter.layer);

export { PacksLive };
