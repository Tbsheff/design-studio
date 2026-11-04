import { Layer } from "effect";

import { PropStore, PropWriter } from "../../components/index.js";

const PropLive = Layer.mergeAll(PropStore.layer, PropWriter.layer);

export { PropLive };
