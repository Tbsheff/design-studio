import { Layer } from "effect";

import {
  CanvasStore,
  CanvasWriter,
  FrameImportWriter,
  LinkedFrameWriter,
  LinkStore,
  LinkWriter,
} from "../../canvas/index.js";
import { FlowVideoStore, FlowVideoWriter } from "../../export/index.js";
import { ProjectWriter } from "../../store/index.js";

const CanvasLive = Layer.mergeAll(
  CanvasStore.layer,
  CanvasWriter.layer,
  FrameImportWriter.layer.pipe(Layer.provide(ProjectWriter.layer)),
  LinkedFrameWriter.layer,
  LinkStore.layer,
  LinkWriter.layer,
  FlowVideoStore.layer,
  FlowVideoWriter.layer
);

export { CanvasLive };
