import { Layer } from "effect";

import { ScreenStore } from "../../app/index.js";
import { ScreenWriter } from "../../export/index.js";

const ScreenLive = Layer.mergeAll(ScreenStore.layer, ScreenWriter.layer);

export { ScreenLive };
