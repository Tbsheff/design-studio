import { Layer } from "effect";

import { ReferenceWriter } from "../../project-ops/index.js";
import { ProjectStore } from "../../store/index.js";

const ReferenceLive = ReferenceWriter.layer.pipe(
  Layer.provide(ProjectStore.layer)
);

export { ReferenceLive };
