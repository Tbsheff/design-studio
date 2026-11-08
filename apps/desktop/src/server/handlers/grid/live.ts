import { Layer } from "effect";

import { GridStore, GridWriter } from "../../style-scope/index.js";

const GridLive = Layer.mergeAll(GridStore.layer, GridWriter.layer);

export { GridLive };
