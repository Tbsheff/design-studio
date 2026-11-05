import { Layer } from "effect";

import { GridStore, GridWriter } from "../../direct-edit/index.js";

const GridLive = Layer.mergeAll(GridStore.layer, GridWriter.layer);

export { GridLive };
