import { Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { DevNoteStore, DevNoteWriter } from "../../comments/index.js";
import { ProjectStore } from "../../store/index.js";

const DevNoteLive = Layer.mergeAll(
  DevNoteStore.layer,
  DevNoteWriter.layer
).pipe(Layer.provide(ProjectStore.layer), Layer.provide(CanvasStore.layer));

export { DevNoteLive };
