import { Layer } from "effect";

import { CritiqueRunner, CritiqueStore } from "../../review/index.js";

const CritiqueLive = Layer.mergeAll(CritiqueRunner.layer, CritiqueStore.layer);

export { CritiqueLive };
