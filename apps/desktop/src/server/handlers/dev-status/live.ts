import { Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { DevStatusStore, DevStatusWriter } from "../../project-ops/index.js";
import { ProjectStore } from "../../store/index.js";

const DevStatusLive = Layer.mergeAll(
  DevStatusStore.layer,
  DevStatusWriter.layer
).pipe(Layer.provide(ProjectStore.layer), Layer.provide(CanvasStore.layer));

export { DevStatusLive };
