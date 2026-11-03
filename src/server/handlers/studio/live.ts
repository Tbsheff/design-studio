import { Layer } from "effect";

import { SkillStore, StudioInfo } from "../../store/index.js";

const StudioLive = Layer.mergeAll(StudioInfo.layer, SkillStore.layer);

export { StudioLive };
