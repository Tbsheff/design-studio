import { Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { MarkupWriter } from "../../comments/index.js";
import { ProjectStore, ProjectWriter } from "../../store/index.js";

const MarkupLive = MarkupWriter.layer.pipe(
  Layer.provide(
    Layer.mergeAll(ProjectStore.layer, ProjectWriter.layer, CanvasStore.layer)
  )
);

export { MarkupLive };
