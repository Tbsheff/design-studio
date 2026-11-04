import { Layer } from "effect";

import {
  CanvasStore,
  CanvasWriter,
  LinkStore,
  LinkWriter,
} from "../../canvas/index.js";

const CanvasLive = Layer.mergeAll(
  CanvasStore.layer,
  CanvasWriter.layer,
  LinkStore.layer,
  LinkWriter.layer
);

export { CanvasLive };
