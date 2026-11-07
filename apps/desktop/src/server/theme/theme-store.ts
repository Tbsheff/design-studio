import { Context, Effect, Layer } from "effect";

import type { DirectionIds } from "./deps.js";
import { toThemePage } from "./theme-find.js";
import type { ListCommand, ThemePage } from "./theme-find.js";
import { getSavedThemes } from "./theme-saved.js";

interface ListThemeCommand extends DirectionIds, ListCommand {}

interface ThemeStoreApi {
  readonly list: (command: ListThemeCommand) => Effect.Effect<ThemePage>;
}

class ThemeStore extends Context.Service<ThemeStore, ThemeStoreApi>()(
  "design-studio/theme/ThemeStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ThemeStore,
    ThemeStore.of({
      list: Effect.fn("ThemeStore.list")(function* run(
        command: ListThemeCommand
      ) {
        return toThemePage(yield* getSavedThemes(command), command);
      }),
    })
  );
}

export { ThemeStore };

export type { ListThemeCommand, ThemeStoreApi };
