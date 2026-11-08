import { Layer } from "effect";

import { BlockStore, BlockWriter } from "../../components/index.js";

const BlockLive = Layer.mergeAll(BlockStore.layer, BlockWriter.layer);

export { BlockLive };
