import { Layer } from "effect";

import { PageStyleRunner } from "../../share/index.js";
import { ThemeStore, ThemeWriter } from "../../style-scope/index.js";

const ThemeLive = Layer.mergeAll(
  PageStyleRunner.layer,
  ThemeStore.layer,
  ThemeWriter.layer
);

export { ThemeLive };
