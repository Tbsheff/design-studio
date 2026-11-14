import { Layer } from "effect";

import {
  CanvasStore,
  CanvasWriter,
  FrameImportWriter,
  FrameTidyWriter,
  LinkedFrameWriter,
  LinkStore,
  LinkWriter,
  PageFramesWriter,
  StateCheckStore,
} from "../../canvas/index.js";
import { FlowVideoStore, FlowVideoWriter } from "../../export/index.js";
import { McpReadStore } from "../../preview/index.js";
import { ProjectWriter } from "../../store/index.js";

const CanvasLive = Layer.mergeAll(
  CanvasStore.layer,
  CanvasWriter.layer,
  FrameImportWriter.layer.pipe(Layer.provide(ProjectWriter.layer)),
  FrameTidyWriter.layer,
  LinkedFrameWriter.layer,
  LinkStore.layer,
  LinkWriter.layer,
  McpReadStore.layer,
  PageFramesWriter.layer,
  StateCheckStore.layer,
  FlowVideoStore.layer,
  FlowVideoWriter.layer
);

export { CanvasLive };
