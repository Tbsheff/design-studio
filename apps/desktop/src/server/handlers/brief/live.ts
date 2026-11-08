import { Layer } from "effect";

import { BriefRunner } from "../../project-ops/index.js";
import { ProjectStore } from "../../store/index.js";

const BriefLive = BriefRunner.layer.pipe(Layer.provide(ProjectStore.layer));

export { BriefLive };
