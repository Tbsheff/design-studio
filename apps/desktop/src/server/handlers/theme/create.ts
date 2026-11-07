import type { Input } from "@design-studio/actions/_core/action";
import type { createTheme } from "@design-studio/actions/theme/create";
import { Effect } from "effect";

import { ThemeWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type CreateThemeInput = Input<typeof createTheme>;

const handle = Effect.fn("theme.create")(function* run(
  input: CreateThemeInput
) {
  const writer = yield* ThemeWriter;

  return yield* writer.create({
    brief: input.brief,
    count: input.count,
    directionId: input.directionId,
    projectId: input.projectId,
    seed: input.seed,
  });
}) satisfies Handle<typeof createTheme>;

export { handle };
