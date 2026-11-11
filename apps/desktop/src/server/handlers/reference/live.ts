import { Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { McpReadStore } from "../../preview/index.js";
import {
  ReferencePinStore,
  ReferencePinWriter,
  ReferenceWriter,
} from "../../project-ops/index.js";
import { ProjectStore } from "../../store/index.js";

const PinReads = Layer.mergeAll(CanvasStore.layer, McpReadStore.layer);

const PinWriterLive = ReferencePinWriter.layer.pipe(Layer.provide(PinReads));

const ReferenceLive = Layer.mergeAll(
  ReferenceWriter.layer,
  ReferencePinStore.layer,
  PinWriterLive
).pipe(Layer.provide(ProjectStore.layer));

export { ReferenceLive };
