import { Layer } from "effect";

import { ThemeStore, ThemeWriter } from "../../style-scope/index.js";

const ThemeLive = Layer.mergeAll(ThemeStore.layer, ThemeWriter.layer);

export { ThemeLive };
