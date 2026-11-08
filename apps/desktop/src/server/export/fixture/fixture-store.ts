import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type { StoredFixture } from "./fixture-model.js";
import { listSavedFixtures } from "./fixture-saved.js";

interface ListFixtureCommand {
  readonly cursor: string | null;
  readonly limit: number;
  readonly projectId: string;
}

interface FixturePage {
  readonly items: readonly StoredFixture[];
  readonly next: string | null;
}

interface FixtureStoreApi {
  readonly get: (
    projectId: string,
    fixtureId: string
  ) => Effect.Effect<StoredFixture, NotFound>;
  readonly list: (command: ListFixtureCommand) => Effect.Effect<FixturePage>;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

class FixtureStore extends Context.Service<FixtureStore, FixtureStoreApi>()(
  "design-studio/export/FixtureStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    FixtureStore,
    FixtureStore.of({
      get: Effect.fn("FixtureStore.get")(function* run(
        projectId: string,
        fixtureId: string
      ) {
        const saved = yield* listSavedFixtures(projectId);
        const found = saved.find((item) => item.id === fixtureId) ?? null;

        if (found === null) {
          return yield* new NotFound({
            message: `No fixture has the id ${fixtureId}. Call list_fixture to see the ids.`,
          });
        }

        return found;
      }),
      list: Effect.fn("FixtureStore.list")(function* run(
        command: ListFixtureCommand
      ) {
        const saved = yield* listSavedFixtures(command.projectId);
        const start = toStart(command.cursor);
        const items = saved.slice(start, start + command.limit);
        const end = start + items.length;
        let next: string | null = null;

        if (end < saved.length) {
          next = String(end);
        }

        const page: FixturePage = { items, next };

        return page;
      }),
    })
  );
}

export { FixtureStore };

export type { FixturePage, FixtureStoreApi, ListFixtureCommand };
