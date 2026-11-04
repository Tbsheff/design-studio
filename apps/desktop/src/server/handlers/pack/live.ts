import { Layer } from "effect";

import { PackStore, PackWriter } from "../../design-system/index.js";

const PackLive = Layer.mergeAll(PackStore.layer, PackWriter.layer);

export { PackLive };
