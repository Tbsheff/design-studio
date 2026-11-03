import { Layer } from "effect";

import { PackStore, PackWriter } from "../../design-system/index.js";

const PacksLive = Layer.mergeAll(PackStore.layer, PackWriter.layer);

export { PacksLive };
