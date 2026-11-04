import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import type { PropChange } from "./prop-model.js";
import type { DeleteCommand, ListedProp } from "./prop-plan.js";
import type { TargetCommand } from "./prop-target.js";
import { inspectDeletePreview, listPropRows } from "./prop-write.js";

interface ListCommand extends TargetCommand {
  readonly cursor: string | null;
  readonly limit: number;
}

interface PropPage {
  readonly items: readonly ListedProp[];
  readonly next: string | null;
}

interface PropStoreApi {
  readonly list: (
    command: ListCommand
  ) => Effect.Effect<PropPage, KnownFailure>;
  readonly previewDelete: (
    command: DeleteCommand
  ) => Effect.Effect<PropChange, KnownFailure>;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toPage = (all: readonly ListedProp[], command: ListCommand): PropPage => {
  const start = toStart(command.cursor);
  const items = all.slice(start, start + command.limit);
  const end = start + items.length;
  let next: string | null = null;

  if (end < all.length) {
    next = String(end);
  }

  return { items, next };
};

class PropStore extends Context.Service<PropStore, PropStoreApi>()(
  "design-studio/components/PropStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PropStore,
    PropStore.of({
      list: Effect.fn("PropStore.list")(function* run(command: ListCommand) {
        const all = yield* listPropRows(command);

        return toPage(all, command);
      }),
      previewDelete: Effect.fn("PropStore.previewDelete")(function* run(
        command: DeleteCommand
      ) {
        return yield* inspectDeletePreview(command);
      }),
    })
  );
}

export { PropStore };

export type { ListCommand, PropPage, PropStoreApi };
