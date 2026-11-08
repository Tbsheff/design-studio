import { Layer } from "effect";

import { ChartStore, ChartWriter } from "../../icons/index.js";

const ChartLive = Layer.mergeAll(ChartStore.layer, ChartWriter.layer);

export { ChartLive };
