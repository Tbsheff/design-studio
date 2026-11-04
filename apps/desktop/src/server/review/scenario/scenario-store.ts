import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import { toDrafts, toScenario } from "./scenario-model.js";
import type { Scenario } from "./scenario-model.js";
import { readSavedScenarios, toSavedPath } from "./scenario-saved.js";
import type { SavedKey } from "./scenario-saved.js";

interface ListCommand extends SavedKey {
  readonly cursor: string | null;
  readonly limit: number;
}

interface ScenarioPage {
  readonly items: readonly Scenario[];
  readonly next: string | null;
}

interface ScenarioStoreApi {
  readonly list: (
    command: ListCommand
  ) => Effect.Effect<ScenarioPage, NotFound>;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

class ScenarioStore extends Context.Service<ScenarioStore, ScenarioStoreApi>()(
  "design-studio/review/ScenarioStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ScenarioStore,
    ScenarioStore.of({
      list: Effect.fn("ScenarioStore.list")(function* run(
        command: ListCommand
      ) {
        const saved = yield* readSavedScenarios(
          toSavedPath(loadConfig().dataDir, command)
        );

        if (saved === null) {
          return yield* new NotFound({
            message: `No scenarios are saved for frame ${command.frameId}. Run create_scenario first.`,
          });
        }

        const start = toStart(command.cursor);

        const all = toDrafts(saved).map((draft) =>
          toScenario(draft, saved.frameId)
        );

        const items = all.slice(start, start + command.limit);
        const end = start + items.length;

        let next: string | null = null;

        if (end < all.length) {
          next = String(end);
        }

        const page: ScenarioPage = { items, next };

        return page;
      }),
    })
  );
}

export { ScenarioStore };

export type { ListCommand, ScenarioPage, ScenarioStoreApi };
