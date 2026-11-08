import { ThemeFileSchema } from "@design-studio/actions/theme/schema";
import { Effect } from "effect";

import { setPrivateJson, toJsonFileReader } from "./deps.js";
import type { DirectionIds } from "./deps.js";
import { EMPTY_FILE } from "./theme-model.js";
import type { ThemeFile } from "./theme-model.js";
import { toThemeFile } from "./theme-paths.js";

const readThemeFile = toJsonFileReader(ThemeFileSchema);

const getSavedThemes = Effect.fn("ThemeSaved.get")(function* run(
  ids: DirectionIds
) {
  const found: ThemeFile | null = yield* readThemeFile(toThemeFile(ids));

  return found ?? EMPTY_FILE;
});

const setSavedThemes = (
  ids: DirectionIds,
  file: ThemeFile
): Effect.Effect<void> => setPrivateJson(toThemeFile(ids), file);

export { getSavedThemes, setSavedThemes };
