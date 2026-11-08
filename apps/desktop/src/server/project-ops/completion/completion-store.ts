import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { getSavedCompletion } from "./completion-file.js";
import type { CompletionRecord } from "./completion-file.js";
import {
  toNextCursor,
  toPageOffset,
  toSpentUsd,
} from "./engine/to-spent-usd.js";

interface ListCommand {
  readonly cursor: string | null;
  readonly limit: number;
  readonly projectId: string;
}

interface CompletionPage {
  readonly capUsd: number;
  readonly isEnabled: boolean;
  readonly items: readonly CompletionRecord[];
  readonly next: string | null;
  readonly spentUsd: number;
}

interface CompletionStoreApi {
  readonly list: (
    command: ListCommand
  ) => Effect.Effect<
    CompletionPage,
    BadRequest | Conflict | NotFound,
    LocalOrgScope
  >;
}

class CompletionStore extends Context.Service<
  CompletionStore,
  CompletionStoreApi
>()("design-studio/project-ops/CompletionStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    CompletionStore,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return CompletionStore.of({
        list: Effect.fn("CompletionStore.list")(function* run(
          command: ListCommand
        ) {
          yield* projects.get(command.projectId);
          const saved = yield* getSavedCompletion(command.projectId);
          const newest = saved.records.toReversed();
          const offset = toPageOffset(command.cursor);

          return {
            capUsd: saved.settings.capUsd,
            isEnabled: saved.settings.isEnabled,
            items: newest.slice(offset, offset + command.limit),
            next: toNextCursor(offset, command.limit, newest.length),
            spentUsd: toSpentUsd(saved.records, Date.now()),
          };
        }),
      });
    })
  );
}

export { CompletionStore };

export type { CompletionPage, CompletionStoreApi, ListCommand };
