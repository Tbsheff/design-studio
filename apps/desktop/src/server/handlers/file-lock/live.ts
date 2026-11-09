import { Layer } from "effect";

import {
  FileLockStore,
  FileLockWriter,
  ProjectStore,
} from "../../store/index.js";

const FileLockLive = Layer.mergeAll(
  FileLockStore.layer,
  FileLockWriter.layer
).pipe(Layer.provide(ProjectStore.layer));

export { FileLockLive };
