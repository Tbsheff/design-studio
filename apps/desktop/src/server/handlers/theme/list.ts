import type { Input } from "@design-studio/actions/_core/action";
import type { listTheme } from "@design-studio/actions/theme/list";
import { Effect } from "effect";

import { ThemeStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type ListThemeInput = Input<typeof listTheme>;

const handle = Effect.fn("theme.list")(function* run(input: ListThemeInput) {
  const store = yield* ThemeStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listTheme>;

export { handle };
