import type { Input } from "@design-studio/actions/_core/action";
import type { applyTheme } from "@design-studio/actions/theme/apply";
import { Effect } from "effect";

import { ThemeWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyThemeInput = Input<typeof applyTheme>;

const handle = Effect.fn("theme.apply")(function* run(input: ApplyThemeInput) {
  const writer = yield* ThemeWriter;

  return yield* writer.apply({
    directionId: input.directionId,
    projectId: input.projectId,
    themeId: input.themeId,
  });
}) satisfies Handle<typeof applyTheme>;

export { handle };
