import { Layer } from "effect";

import {
  CanvasStore,
  CanvasWriter,
  LinkStore,
  LinkWriter,
} from "../../canvas/index.js";
import { FlowVideoWriter } from "../../export/index.js";

const CanvasLive = Layer.mergeAll(
  CanvasStore.layer,
  CanvasWriter.layer,
  LinkStore.layer,
  LinkWriter.layer,
  FlowVideoWriter.layer
);

export { CanvasLive };
