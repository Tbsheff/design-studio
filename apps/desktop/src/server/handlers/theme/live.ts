import { Layer } from "effect";

import { ThemeStore, ThemeWriter } from "../../direct-edit/index.js";

const ThemeLive = Layer.mergeAll(ThemeStore.layer, ThemeWriter.layer);

export { ThemeLive };
