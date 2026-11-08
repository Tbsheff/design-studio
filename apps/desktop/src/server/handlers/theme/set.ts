import type { Input } from "@design-studio/actions/_core/action";
import type { setTheme } from "@design-studio/actions/theme/set";
import { Effect } from "effect";

import { ThemeWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type SetThemeInput = Input<typeof setTheme>;

const handle = Effect.fn("theme.set")(function* run(input: SetThemeInput) {
  const writer = yield* ThemeWriter;

  return yield* writer.set({
    directionId: input.directionId,
    projectId: input.projectId,
    themeId: input.themeId,
  });
}) satisfies Handle<typeof setTheme>;

export { handle };
