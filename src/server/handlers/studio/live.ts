import { Layer } from "effect";

import { SkillStore } from "../../store/index.js";
import { StudioInfo } from "../../store/studio-info.js";

const StudioLive = Layer.mergeAll(StudioInfo.layer, SkillStore.layer);

export { StudioLive };
