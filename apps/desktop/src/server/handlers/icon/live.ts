import { Layer } from "effect";

import { IconStore, IconWriter } from "../../icons/index.js";

const IconLive = Layer.mergeAll(IconStore.layer, IconWriter.layer);

export { IconLive };
