import { Context, Effect, Layer } from "effect";

import type { RefCommand, TargetCommand } from "./animation-scope.js";
import { runGet, runList, runPreviewDelete } from "./animation-write.js";
import type { AnimationRemoved } from "./animation-write.js";
import type { KnownFailure } from "./deps.js";
import type { AnimationModel } from "./engine/index.js";

interface ListCommand extends TargetCommand {
  readonly cursor: string | null;
  readonly limit: number;
}

interface AnimationSummary {
  readonly durationMs: number;
  readonly file: string;
  readonly id: string;
  readonly loop: AnimationModel["loop"];
  readonly name: string;
  readonly trackCount: number;
  readonly trigger: AnimationModel["trigger"];
}

interface AnimationPage {
  readonly items: readonly AnimationSummary[];
  readonly next: string | null;
}

interface AnimationStoreApi {
  readonly get: (
    command: RefCommand
  ) => Effect.Effect<AnimationModel, KnownFailure>;
  readonly list: (
    command: ListCommand
  ) => Effect.Effect<AnimationPage, KnownFailure>;
  readonly previewDelete: (
    command: RefCommand
  ) => Effect.Effect<AnimationRemoved, KnownFailure>;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toSummary = (model: AnimationModel): AnimationSummary => ({
  durationMs: model.durationMs,
  file: model.file,
  id: model.id,
  loop: model.loop,
  name: model.name,
  trackCount: model.tracks.length,
  trigger: model.trigger,
});

const toPage = (
  all: readonly AnimationModel[],
  command: ListCommand
): AnimationPage => {
  const start = toStart(command.cursor);

  const items = all
    .slice(start, start + command.limit)
    .map((model) => toSummary(model));

  const end = start + items.length;
  let next: string | null = null;

  if (end < all.length) {
    next = String(end);
  }

  return { items, next };
};

class AnimationStore extends Context.Service<
  AnimationStore,
  AnimationStoreApi
>()("design-studio/state-styles/AnimationStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    AnimationStore,
    AnimationStore.of({
      get: Effect.fn("AnimationStore.get")(function* run(command: RefCommand) {
        return yield* runGet(command);
      }),
      list: Effect.fn("AnimationStore.list")(function* run(
        command: ListCommand
      ) {
        const all = yield* runList(command);

        return toPage(all, command);
      }),
      previewDelete: Effect.fn("AnimationStore.previewDelete")(function* run(
        command: RefCommand
      ) {
        return yield* runPreviewDelete(command);
      }),
    })
  );
}

export { AnimationStore };

export type { AnimationPage, AnimationStoreApi, AnimationSummary, ListCommand };
